'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures } from '@/lib/constants/plans'
import { createUserWithProfile, generatePassword } from '@/lib/users/admin'

const createTeacherSchema = z.object({
  name: z.string().min(2, 'Informe o nome').max(255),
  email: z.string().email('E-mail inválido').max(255),
  instruments: z.string().optional(),
})

export type TeacherActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  tempPassword?: string
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
    instruments: formData.get('instruments'),
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
    .select('plan_type')
    .eq('id', me.schoolId)
    .single()

  const features = planFeatures(school?.plan_type)
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
    return { ok: false, error: 'Não foi possível criar o perfil de professor.' }
  }

  revalidatePath('/admin/teachers')
  return { ok: true, tempPassword, createdEmail: email }
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
