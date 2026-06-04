'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'

const enrollSchema = z.object({
  studentId: z.string().uuid(),
  planId: z.string().uuid(),
  dueDay: z.coerce.number().int().min(1).max(31),
  customAmount: z.coerce.number().min(0).optional(),
})

export type EnrollActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function enrollStudent(
  _prev: EnrollActionState,
  formData: FormData,
): Promise<EnrollActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const { features } = await getPlanContext()
  if (!features.financial) return { ok: false, error: 'Financeiro disponível apenas em planos pagos.' }

  const parsed = enrollSchema.safeParse({
    studentId: formData.get('studentId'),
    planId: formData.get('planId'),
    dueDay: formData.get('dueDay'),
    customAmount: formData.get('customAmount') || undefined,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])),
    }
  }

  const d = parsed.data
  const supabase = await createClient()

  // Cancela matrícula ativa anterior (um aluno = uma matrícula ativa por vez).
  await supabase
    .from('enrollments')
    .update({ status: 'cancelled' })
    .eq('school_id', me.schoolId)
    .eq('student_id', d.studentId)
    .eq('status', 'active')

  const { error } = await supabase.from('enrollments').insert({
    school_id: me.schoolId,
    student_id: d.studentId,
    plan_id: d.planId,
    due_day: d.dueDay,
    custom_amount: d.customAmount ?? null,
    status: 'active',
  })

  if (error) return { ok: false, error: 'Não foi possível criar a matrícula.' }

  revalidatePath(`/admin/students/${d.studentId}`)
  return { ok: true }
}

// Encerra a matrícula ativa do aluno (não apaga histórico de cobranças).
export async function cancelEnrollment(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return

  const studentId = String(formData.get('studentId') ?? '')
  if (!studentId) return

  const supabase = await createClient()
  await supabase
    .from('enrollments')
    .update({ status: 'cancelled' })
    .eq('student_id', studentId)
    .eq('school_id', me.schoolId)
    .eq('status', 'active')

  revalidatePath(`/admin/students/${studentId}`)
}
