'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'

export type PlanActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

// Campos numéricos opcionais chegam como '' do form — vira undefined antes do coerce.
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().min(0).optional(),
)
const optionalAge = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().min(0).max(120).optional(),
)

const planSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    billingType: z.enum(['monthly', 'per_class']).default('monthly'),
    amount: z.coerce.number().min(0),
    earlyPayAmount: optionalNumber,
    minAge: optionalAge,
    maxAge: optionalAge,
    active: z.coerce.boolean().default(true),
  })
  .refine((d) => d.earlyPayAmount == null || d.earlyPayAmount <= d.amount, {
    path: ['earlyPayAmount'],
    message: 'O valor com desconto deve ser menor ou igual ao valor cheio.',
  })
  .refine((d) => d.minAge == null || d.maxAge == null || d.minAge <= d.maxAge, {
    path: ['maxAge'],
    message: 'A idade máxima deve ser maior ou igual à mínima.',
  })

type PlanData = z.infer<typeof planSchema>

function parsePlan(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    billingType: formData.get('billingType') || 'monthly',
    amount: formData.get('amount'),
    earlyPayAmount: formData.get('earlyPayAmount'),
    minAge: formData.get('minAge'),
    maxAge: formData.get('maxAge'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true' || formData.get('active') == null,
  })
}

function toFieldErrors(error: z.ZodError): PlanActionState {
  const flat = error.flatten().fieldErrors
  return {
    ok: false,
    fieldErrors: Object.fromEntries(
      Object.entries(flat).map(([k, v]) => [k, (v as string[] | undefined)?.[0] ?? 'Inválido']),
    ),
  }
}

// Monta a row do banco a partir dos dados validados (per_class não usa desconto).
function planRow(d: PlanData) {
  const earlyPay = d.billingType === 'monthly' ? (d.earlyPayAmount ?? null) : null
  return {
    name: d.name,
    description: d.description ?? null,
    billing_type: d.billingType,
    amount: d.amount,
    early_pay_amount: earlyPay,
    min_age: d.minAge ?? null,
    max_age: d.maxAge ?? null,
    active: d.active,
  }
}

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

  const parsed = parsePlan(formData)
  if (!parsed.success) return toFieldErrors(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('plans').insert({ ...planRow(parsed.data), school_id: me.schoolId })
  if (error) return { ok: false, error: 'Não foi possível criar o plano.' }

  revalidatePath('/plans')
  return { ok: true }
}

export async function updatePlan(_prev: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const me = await requireFinancial()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const planId = String(formData.get('planId') ?? '')
  const parsed = parsePlan(formData)
  if (!parsed.success) return toFieldErrors(parsed.error)

  const supabase = await createClient()
  await supabase.from('plans').update(planRow(parsed.data)).eq('id', planId).eq('school_id', me.schoolId)

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
