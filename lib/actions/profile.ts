'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export type ProfileActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const profileSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirmation: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmation, {
    message: 'As senhas não conferem',
    path: ['confirmation'],
  })

function fe(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
  )
}

// Atualiza nome/email/telefone do próprio usuário
export async function updateProfile(_prev: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const me = await getCurrentUser()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const d = parsed.data
  const admin = await createAdminClient()

  if (d.email !== me.email) {
    const { error } = await admin.auth.admin.updateUserById(me.id, { email: d.email })
    if (error) {
      const dup = /already|exists/i.test(error.message)
      return {
        ok: false,
        fieldErrors: dup ? { email: 'Este e-mail já está em uso.' } : undefined,
        error: dup ? undefined : 'Erro ao atualizar e-mail.',
      }
    }
  }

  const supabase = await createClient()
  await supabase
    .from('users')
    .update({ name: d.name, email: d.email, phone: d.phone ?? null })
    .eq('id', me.id)

  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { ok: true }
}

// Atualiza a senha do próprio usuário (verifica a atual primeiro)
export async function updateOwnPassword(_prev: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const me = await getCurrentUser()
  if (!me?.email) return { ok: false, error: 'Acesso negado.' }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmation: formData.get('confirmation'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  // Valida a senha atual fazendo re-login (Supabase não tem verifyPassword direto)
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: me.email,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { ok: false, fieldErrors: { currentPassword: 'Senha atual incorreta.' } }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
  if (error) return { ok: false, error: 'Erro ao atualizar senha.' }

  return { ok: true }
}

// Apaga a própria conta — disponível para qualquer usuário
export async function deleteOwnAccount(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.email) return

  const password = String(formData.get('password') ?? '')
  if (!password) return

  // Valida senha
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: me.email, password })
  if (error) return

  // Apaga via service-role (cascateia tudo)
  const admin = await createAdminClient()
  await admin.auth.admin.deleteUser(me.id)
  await supabase.auth.signOut()

  redirect('/login')
}
