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

  // Troca a matrícula dentro de uma transação. Uma falha não deixa o aluno
  // sem a matrícula anterior, e o banco valida escola/plano/aluno sob lock.
  const { data, error } = await supabase.rpc('replace_active_enrollment', {
    p_student_id: d.studentId,
    p_plan_id: d.planId,
    p_due_day: d.dueDay,
    p_custom_amount: d.customAmount ?? null,
  })
  if (error || !(data as { ok?: boolean } | null)?.ok) {
    return { ok: false, error: 'Não foi possível criar a matrícula. Confira o aluno e o plano selecionados.' }
  }

  revalidatePath(`/admin/students/${d.studentId}`)
  revalidatePath('/plans')
  revalidatePath('/financial')
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
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('school_id', me.schoolId)
    .eq('status', 'active')

  revalidatePath(`/admin/students/${studentId}`)
}
