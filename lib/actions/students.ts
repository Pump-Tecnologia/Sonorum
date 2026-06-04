'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures } from '@/lib/constants/plans'
import { createUserWithProfile, generatePassword } from '@/lib/users/admin'

const createStudentSchema = z.object({
  name: z.string().min(2, 'Informe o nome').max(255),
  email: z.string().email('E-mail inválido').max(255),
  phone: z.string().max(20).optional(),
  parentContact: z.string().max(255).optional(),
  instrumentCategory: z.string().max(255).optional(),
  instrument: z.string().optional(),
  status: z.enum(['active', 'paused', 'inactive']).default('active'),
  notifyTo: z.enum(['student', 'parent', 'both']).default('both'),
  objectives: z.string().optional(),
})

export type StudentActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  tempPassword?: string
  createdEmail?: string
}

export async function createStudent(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const admin = await createAdminClient()

  // Limite de alunos conforme o plano (Essencial = 5; pagos = ilimitado).
  const { data: school } = await admin
    .from('schools')
    .select('plan_type')
    .eq('id', me.schoolId)
    .single()

  const features = planFeatures(school?.plan_type)
  if (Number.isFinite(features.studentLimit)) {
    const { count } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', me.schoolId)
      .eq('role', 'student')
    if ((count ?? 0) >= features.studentLimit) {
      return {
        ok: false,
        error: `Limite de ${features.studentLimit} alunos atingido no plano ${features.label}. Faça upgrade para alunos ilimitados.`,
      }
    }
  }

  const parsed = createStudentSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    parentContact: formData.get('parentContact') || undefined,
    instrumentCategory: formData.get('instrumentCategory') || undefined,
    instrument: formData.get('instrument') || undefined,
    status: formData.get('status') || 'active',
    notifyTo: formData.get('notifyTo') || 'both',
    objectives: formData.get('objectives') || undefined,
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

  const d = parsed.data
  const instrumentList = (d.instrument ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const tempPassword = generatePassword()
  const result = await createUserWithProfile({
    email: d.email,
    password: tempPassword,
    name: d.name,
    role: 'student',
    schoolId: me.schoolId,
    profile: {
      phone: d.phone ?? null,
      parent_contact: d.parentContact ?? null,
      instrument_category: d.instrumentCategory ?? null,
      instrument: instrumentList.length ? instrumentList : null,
      status: d.status,
      notify_to: d.notifyTo,
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.isDuplicate ? { email: result.error } : undefined,
      error: result.isDuplicate ? undefined : result.error,
    }
  }

  // Objetivos viram metas (uma por linha).
  const goals = (d.objectives ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text) => ({ student_id: result.userId, school_id: me.schoolId, text, completed: false }))

  if (goals.length) {
    await admin.from('student_goals').insert(goals)
  }

  revalidatePath('/admin/students')
  return { ok: true, tempPassword, createdEmail: d.email }
}

// Exclui um aluno (apaga o auth user → cascata em perfil, metas e notas).
export async function deleteStudent(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return

  const studentId = String(formData.get('studentId') ?? '')
  if (!studentId) return

  const admin = await createAdminClient()
  const { data: target } = await admin
    .from('users')
    .select('id, role, school_id')
    .eq('id', studentId)
    .single()

  // Só apaga aluno da própria escola.
  if (!target || target.role !== 'student' || target.school_id !== me.schoolId) return

  await admin.auth.admin.deleteUser(studentId)
  revalidatePath('/admin/students')
  redirect('/admin/students')
}
