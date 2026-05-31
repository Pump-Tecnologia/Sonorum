'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient, createAdminClient } from '@/lib/supabase/server'

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ActionState,
} from './schemas'

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const flat = error.flatten().fieldErrors
  return Object.fromEntries(
    Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
  )
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ── Login ───────────────────────────────────────────────────────────────────
export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { ok: false, error: 'E-mail ou senha incorretos.' }

  const next = String(formData.get('next') || '/dashboard')
  revalidatePath('/', 'layout')
  redirect(next.startsWith('/') ? next : '/dashboard')
}

// ── Registro (cria escola + usuário admin) ──────────────────────────────────
export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    schoolName: formData.get('schoolName'),
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const { schoolName, name, email, password } = parsed.data
  const admin = await createAdminClient()

  // 1. Cria a escola.
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({ name: schoolName, slug: slugify(schoolName), plan_type: 'free', student_limit: 5 })
    .select('id')
    .single()

  if (schoolError || !school) {
    const dup = schoolError?.code === '23505'
    return {
      ok: false,
      fieldErrors: dup ? { schoolName: 'Já existe uma escola com esse nome.' } : undefined,
      error: dup ? undefined : 'Não foi possível criar a escola. Tente novamente.',
    }
  }

  const schoolId = school.id as string

  // 2. Cria o usuário admin. O trigger handle_new_user cria a linha base em
  //    public.users; app_metadata também guarda role/school_id (fonte segura).
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role: 'admin', school_id: schoolId },
  })

  if (userError || !created.user) {
    // Rollback da escola órfã.
    await admin.from('schools').delete().eq('id', schoolId)
    const dup = /already registered|exists/i.test(userError?.message ?? '')
    return {
      ok: false,
      fieldErrors: dup ? { email: 'Este e-mail já está cadastrado.' } : undefined,
      error: dup ? undefined : 'Não foi possível criar o usuário. Tente novamente.',
    }
  }

  // 3. Garante role/school_id no perfil. O GoTrue só aplica o app_metadata custom
  //    DEPOIS do INSERT, então o trigger não o vê — setamos explicitamente aqui.
  const { error: profileError } = await admin
    .from('users')
    .update({ role: 'admin', school_id: schoolId, name })
    .eq('id', created.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    await admin.from('schools').delete().eq('id', schoolId)
    return { ok: false, error: 'Não foi possível finalizar o cadastro. Tente novamente.' }
  }

  // 4. Loga o admin recém-criado (seta cookies de sessão).
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) redirect('/login')

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ── Logout ──────────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Limpa o cookie de impersonação se estiver pendente — evita banner stale
  // no próximo login.
  const jar = await cookies()
  jar.delete('sonorum_impersonator')
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ── Esqueci a senha ─────────────────────────────────────────────────────────
export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  })

  // Resposta neutra: não revela se o e-mail existe.
  return { ok: true }
}

// ── Redefinir senha (após clicar no link do e-mail) ─────────────────────────
export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { ok: false, error: 'Link expirado ou inválido. Solicite um novo.' }

  redirect('/dashboard')
}
