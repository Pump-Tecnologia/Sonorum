'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { effectivePlanFeatures } from '@/lib/auth/plan'
import { sendCredentialsEmail } from '@/lib/notifications/credentials'
import { createUserWithProfile, generatePassword } from '@/lib/users/admin'

const instrumentsSchema = z.object({ instruments: z.string().optional() })

const createTeacherSchema = z.object({
  name: z.string().min(2, 'Informe o nome').max(255),
  email: z.string().email('E-mail inválido').max(255),
  instruments: z.string().optional(),
})

export type TeacherActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  createdEmail?: string
}

export async function createTeacher(
  _prev: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const parsed = createTeacherSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    instruments: formData.get('instruments') || undefined,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
      ),
    }
  }

  const { name, email, instruments } = parsed.data

  const admin = await createAdminClient()

  // Limite de professores conforme o plano (Essencial = 1; pagos = ilimitado).
  const { data: school } = await admin
    .from('schools')
    .select('plan_type, feature_overrides, expiration_date, name, custom_name')
    .eq('id', me.schoolId)
    .single()

  const features = effectivePlanFeatures(school?.plan_type, school?.expiration_date, school?.feature_overrides)
  if (Number.isFinite(features.teacherLimit)) {
    const { count } = await admin
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', me.schoolId)
    if ((count ?? 0) >= features.teacherLimit) {
      return {
        ok: false,
        error: `Limite de ${features.teacherLimit} professor(es) no plano ${features.label}. Faça upgrade para professores ilimitados.`,
      }
    }
  }

  const instrumentList = (instruments ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const tempPassword = generatePassword()
  const result = await createUserWithProfile({
    email,
    password: tempPassword,
    name,
    role: 'teacher',
    schoolId: me.schoolId,
  })

  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.isDuplicate ? { email: result.error } : undefined,
      error: result.isDuplicate ? undefined : result.error,
    }
  }

  const { error: teacherError } = await admin.from('teachers').insert({
    user_id: result.userId,
    school_id: me.schoolId,
    instruments: instrumentList.length ? instrumentList : null,
    status: 'active',
  })

  if (teacherError) {
    await admin.auth.admin.deleteUser(result.userId)
    if (teacherError.message.includes('teacher_limit_reached')) {
      return { ok: false, error: `Limite de ${features.teacherLimit} professor(es) no plano ${features.label} atingido.` }
    }
    return { ok: false, error: 'Não foi possível criar o perfil de professor.' }
  }

  const setupEmail = await sendCredentialsEmail({
    admin,
    to: email,
    name,
    schoolName: school?.custom_name || school?.name || null,
    kind: 'new',
  })
  if (!setupEmail.ok) {
    await admin.auth.admin.deleteUser(result.userId)
    return { ok: false, error: 'Não foi possível enviar o link de definição de senha. O professor não foi criado.' }
  }

  revalidatePath('/admin/teachers')
  return { ok: true, createdEmail: email }
}

export type ToggleTeachingResult = { ok: boolean; error?: string }

// Admin liga/desliga a própria conta como professor também (linha em
// public.teachers). Não mexe no `role` — ele continua 'admin'; quem passa a
// refletir isso é `isTeacher` em lib/auth/session.ts. Cobre tanto o toggle
// manual (qualquer admin) quanto o cadastro automático dos planos Solo/Solo
// Pro (ver lib/auth/actions.ts).
export async function enableSelfTeaching(_formData: FormData): Promise<ToggleTeachingResult> {
  void _formData
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const admin = await createAdminClient()

  const { data: existing } = await admin.from('teachers').select('id').eq('user_id', me.id).maybeSingle()
  if (existing) return { ok: true }

  // Mesmo limite de professores do plano, aplicado aqui também.
  const { data: school } = await admin
    .from('schools')
    .select('plan_type, feature_overrides, expiration_date')
    .eq('id', me.schoolId)
    .single()

  const features = effectivePlanFeatures(school?.plan_type, school?.expiration_date, school?.feature_overrides)
  if (Number.isFinite(features.teacherLimit)) {
    const { count } = await admin
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', me.schoolId)
    if ((count ?? 0) >= features.teacherLimit) {
      return {
        ok: false,
        error: `Limite de ${features.teacherLimit} professor(es) no plano ${features.label}. Faça upgrade para professores ilimitados.`,
      }
    }
  }

  const { error } = await admin.from('teachers').insert({
    user_id: me.id,
    school_id: me.schoolId,
    status: 'active',
  })
  if (error) {
    if (error.message.includes('teacher_limit_reached')) {
      return { ok: false, error: `Limite de ${features.teacherLimit} professor(es) no plano ${features.label} atingido.` }
    }
    return { ok: false, error: 'Não foi possível ativar o modo professor.' }
  }

  revalidatePath('/profile')
  revalidatePath('/admin/teachers')
  return { ok: true }
}

export async function disableSelfTeaching(_formData: FormData): Promise<ToggleTeachingResult> {
  void _formData
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const admin = await createAdminClient()
  await admin.from('teachers').delete().eq('user_id', me.id).eq('school_id', me.schoolId)

  revalidatePath('/profile')
  revalidatePath('/admin/teachers')
  return { ok: true }
}

// Admin edita os próprios instrumentos (linha de public.teachers). Existe pq
// contas presas a 1 professor (Essencial/Solo/Solo Pro) não têm acesso a
// /admin/teachers/[id]/edit — o toggle "também dou aula" em /profile é o único
// lugar onde esse admin gerencia seu próprio perfil de professor.
export async function updateOwnInstruments(
  _prev: ToggleTeachingResult,
  formData: FormData,
): Promise<ToggleTeachingResult> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.isTeacher) return { ok: false, error: 'Acesso negado.' }

  const parsed = instrumentsSchema.safeParse({ instruments: formData.get('instruments') || undefined })
  if (!parsed.success) return { ok: false, error: 'Instrumentos inválidos.' }

  const instrumentList = (parsed.data.instruments ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const admin = await createAdminClient()
  const { error } = await admin
    .from('teachers')
    .update({ instruments: instrumentList.length ? instrumentList : null })
    .eq('user_id', me.id)

  if (error) return { ok: false, error: 'Não foi possível salvar os instrumentos.' }

  revalidatePath('/profile')
  return { ok: true }
}

// Exclui um professor (apaga o auth user → cascata em perfil e teachers).
export async function deleteTeacher(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return

  const teacherId = String(formData.get('teacherId') ?? '')
  if (!teacherId) return

  const admin = await createAdminClient()
  const { data: teacher } = await admin
    .from('teachers')
    .select('id, user_id, school_id')
    .eq('id', teacherId)
    .single()

  if (!teacher || teacher.school_id !== me.schoolId) return

  await admin.auth.admin.deleteUser(teacher.user_id)
  revalidatePath('/admin/teachers')
}
