'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'

export type PlanActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const planSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  amount: z.coerce.number().min(0),
})

async function requireFinancial(): Promise<{ schoolId: string } | null> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return null
  const { features } = await getPlanContext()
  if (!features.financial) return null
  return { schoolId: me.schoolId }
}

export async function createPlan(_prev: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const me = await requireFinancial()
  if (!me) return { ok: false, error: 'Disponível apenas em planos pagos.' }

  const parsed = planSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    amount: formData.get('amount'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])) }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('plans').insert({ ...parsed.data, school_id: me.schoolId })
  if (error) return { ok: false, error: 'Não foi possível criar o plano.' }

  revalidatePath('/plans')
  return { ok: true }
}

export async function updatePlan(_prev: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const me = await requireFinancial()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const planId = String(formData.get('planId') ?? '')
  const parsed = planSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    amount: formData.get('amount'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])) }
  }

  const supabase = await createClient()
  await supabase.from('plans').update(parsed.data).eq('id', planId).eq('school_id', me.schoolId)

  revalidatePath('/plans')
  return { ok: true }
}

export async function deletePlan(formData: FormData) {
  const me = await requireFinancial()
  if (!me) return
  const planId = String(formData.get('planId') ?? '')
  const supabase = await createClient()
  await supabase.from('plans').delete().eq('id', planId).eq('school_id', me.schoolId)
  revalidatePath('/plans')
}
