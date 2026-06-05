'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { notify } from '@/lib/notifications/notify'
import { amountForPayment } from '@/lib/finance'
import { appBaseUrl } from '@/lib/payments'

// Status de aula que contam como "aula dada" para planos por-aula.
const ATTENDED_STATUSES = ['completed', 'late']

// ── Cobrança avulsa no PIX (todos os planos, inclusive Essencial) ────────────
// Cria uma cobrança pontual ligada direto ao aluno (sem matrícula). A baixa é
// manual; o pagamento é via PIX da própria escola (custo zero, sem gateway).
const adHocChargeSchema = z.object({
  studentId: z.string().uuid('Selecione o aluno'),
  amount: z.coerce.number().positive('Informe um valor maior que zero').max(1_000_000, 'Valor muito alto'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  description: z.string().trim().max(120, 'Descrição muito longa').optional().or(z.literal('')),
})

export type AdHocChargeState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  chargeId?: string
}

export async function createAdHocCharge(
  _prev: AdHocChargeState,
  formData: FormData,
): Promise<AdHocChargeState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const parsed = adHocChargeSchema.safeParse({
    studentId: formData.get('studentId'),
    amount: formData.get('amount'),
    dueDate: formData.get('dueDate'),
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, (v as string[] | undefined)?.[0] ?? 'Inválido']),
      ),
    }
  }

  const { studentId, amount, dueDate, description } = parsed.data
  const supabase = await createClient()

  // O aluno tem que ser da escola do admin (defesa em profundidade além da RLS).
  const { data: student } = await supabase
    .from('users')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', me.schoolId)
    .eq('role', 'student')
    .maybeSingle()
  if (!student) return { ok: false, fieldErrors: { studentId: 'Aluno não encontrado nesta escola.' } }

  const { data: inserted, error } = await supabase
    .from('charges')
    .insert({
      school_id: me.schoolId,
      student_id: studentId,
      enrollment_id: null,
      amount,
      early_pay_amount: null,
      due_date: dueDate,
      status: 'pending',
      description: description || null,
    })
    .select('id')
    .single()

  if (error || !inserted) return { ok: false, error: 'Não foi possível criar a cobrança.' }

  // Notifica o aluno com o link de pagamento (PIX). Não bloqueia a criação.
  await notify('charge.created', studentId, {
    amount,
    dueDate: new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
    planName: description || null,
    payUrl: `${appBaseUrl()}/pagar/${inserted.id}`,
  }, { relatedId: inserted.id }).catch(() => {})

  revalidatePath('/cobrancas')
  return { ok: true, chargeId: inserted.id }
}

export async function updateChargeStatus(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return

  const chargeId = String(formData.get('chargeId') ?? '')
  const status = String(formData.get('status') ?? '')
  const paymentMethod = String(formData.get('paymentMethod') ?? '') || null

  const supabase = await createClient()

  // Lê a cobrança antes de baixar — precisamos do valor cheio, do desconto e do
  // vencimento para decidir quanto foi efetivamente pago. student_id direto cobre
  // a cobrança avulsa (sem matrícula).
  const { data: charge } = await supabase
    .from('charges')
    .select('status, amount, early_pay_amount, due_date, enrollment_id, student_id, enrollment:enrollments(student_id)')
    .eq('id', chargeId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!charge) return

  // Cobrança de matrícula (plano mensal) exige o módulo financeiro (pago).
  // Cobrança avulsa (student_id, sem matrícula) é liberada em todos os planos.
  if (charge.enrollment_id != null) {
    const { features } = await getPlanContext()
    if (!features.financial) return
  }

  type ChargeUpdate = {
    status: string
    paid_at?: string | null
    payment_method?: string | null
    paid_amount?: number | null
  }
  // Não reabre cobrança cancelada por engano (cancelled → paid/pending).
  if (charge.status === 'cancelled' && status !== 'cancelled') return

  const update: ChargeUpdate = { status }
  let paidAmount: number | null = null

  if (status === 'paid') {
    const paidOn = new Date().toISOString().slice(0, 10)
    paidAmount = amountForPayment(
      Number(charge.amount),
      charge.early_pay_amount != null ? Number(charge.early_pay_amount) : null,
      charge.due_date,
      paidOn,
    )
    update.paid_at = new Date().toISOString()
    update.payment_method = paymentMethod
    update.paid_amount = paidAmount
  } else if (status === 'pending') {
    update.paid_at = null
    update.payment_method = null
    update.paid_amount = null
  }

  await supabase.from('charges').update(update).eq('id', chargeId).eq('school_id', me.schoolId)

  // Pagamento confirmado → notifica o aluno com o valor realmente recebido.
  if (status === 'paid') {
    const enr = charge.enrollment as { student_id: string } | null
    const studentId = enr?.student_id ?? charge.student_id ?? null
    if (studentId) {
      await notify('charge.paid', studentId, {
        amount: paidAmount ?? Number(charge.amount),
        paymentMethod,
      }, { relatedId: chargeId })
    }
  }

  revalidatePath('/financial')
  revalidatePath('/cobrancas')
}

// Gera cobranças do mês para todas as matrículas ativas da escola.
// Mensal → valor cheio do plano/custom + snapshot do desconto de pontualidade.
// Por aula → preço por aula × nº de aulas realizadas (completed/late) no mês.
export async function generateMonthlyCharges(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return
  const { features } = await getPlanContext()
  if (!features.financial) return

  const monthStr = String(formData.get('month') ?? '') // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return

  const [year, month] = monthStr.split('-').map(Number)
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id, due_day, custom_amount, plan:plans(amount, billing_type, early_pay_amount)')
    .eq('school_id', me.schoolId)
    .eq('status', 'active')

  if (!enrollments?.length) return

  // Conta aulas realizadas no mês por aluno (necessário só p/ planos por-aula).
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 1) // exclusivo
  const { data: lessons } = await supabase
    .from('lessons')
    .select('student_id, status')
    .eq('school_id', me.schoolId)
    .gte('start_datetime', monthStart.toISOString())
    .lt('start_datetime', monthEnd.toISOString())
    .in('status', ATTENDED_STATUSES)

  const attendedByStudent = new Map<string, number>()
  for (const l of lessons ?? []) {
    attendedByStudent.set(l.student_id, (attendedByStudent.get(l.student_id) ?? 0) + 1)
  }

  type ChargeInsert = {
    school_id: string
    enrollment_id: string
    amount: number
    early_pay_amount: number | null
    due_date: string
    status: string
  }
  const charges: ChargeInsert[] = []

  // Último dia do mês alvo — evita que due_day 29–31 role pro mês seguinte.
  const lastDayOfMonth = new Date(year, month, 0).getDate()

  for (const e of enrollments) {
    const plan = e.plan as { amount: number; billing_type: string; early_pay_amount: number | null } | null
    const dueDay = Math.min(e.due_day, lastDayOfMonth)
    const dueDate = new Date(year, month - 1, dueDay).toISOString().slice(0, 10)
    const unit = e.custom_amount != null ? Number(e.custom_amount) : Number(plan?.amount ?? 0)

    if (plan?.billing_type === 'per_class') {
      const count = attendedByStudent.get(e.student_id) ?? 0
      if (count === 0) continue // sem aulas dadas → sem cobrança no mês
      charges.push({
        school_id: me.schoolId,
        enrollment_id: e.id,
        amount: unit * count,
        early_pay_amount: null,
        due_date: dueDate,
        status: 'pending',
      })
    } else {
      // Mensal: desconto só vale se o valor não foi sobrescrito por um custom.
      const earlyPay = e.custom_amount == null && plan?.early_pay_amount != null
        ? Number(plan.early_pay_amount)
        : null
      charges.push({
        school_id: me.schoolId,
        enrollment_id: e.id,
        amount: unit,
        early_pay_amount: earlyPay,
        due_date: dueDate,
        status: 'pending',
      })
    }
  }

  if (!charges.length) return

  // upsert ignoreDuplicates → só as recém-criadas retornam (não duplica o mês).
  const { data: inserted } = await supabase
    .from('charges')
    .upsert(charges, { onConflict: 'enrollment_id,due_date', ignoreDuplicates: true })
    .select('id, amount, due_date, enrollment:enrollments(student_id, plan:plans(name))')

  if (inserted?.length) {
    await Promise.all(inserted.map((c) => {
      const enr = c.enrollment as { student_id: string; plan: { name: string } | null } | null
      if (!enr) return Promise.resolve()
      return notify('charge.created', enr.student_id, {
        amount: Number(c.amount),
        dueDate: new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
        planName: enr.plan?.name ?? null,
        payUrl: `${appBaseUrl()}/pagar/${c.id}`,
      }, { relatedId: c.id })
    }))
  }

  revalidatePath('/financial')
}
