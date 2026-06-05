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

// ── Cobrança de um aluno (plano-primeiro; avulsa só via checkbox) ────────────
// Disponível em todos os planos (financeiro liberado no Essencial). A cobrança
// padrão vem do PLANO/matrícula ativa do aluno; "avulsa" é uma exceção marcada.
export type CreateChargeState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  chargeId?: string
}

type ChargeInsert = {
  school_id: string
  student_id: string | null
  enrollment_id: string | null
  amount: number
  early_pay_amount: number | null
  due_date: string
  status: 'pending'
  description: string | null
}

// Deriva a cobrança a partir da matrícula ativa do aluno (mensalidade = valor
// cheio + snapshot do desconto; por-aula = preço × aulas realizadas no mês).
async function resolvePlanCharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  studentId: string,
  dueDate: string,
): Promise<{ enrollmentId: string; amount: number; earlyPay: number | null; planName: string | null } | { error: string }> {
  const { data: enr } = await supabase
    .from('enrollments')
    .select('id, custom_amount, plan:plans(name, amount, billing_type, early_pay_amount)')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()
  if (!enr) {
    return { error: 'Aluno sem matrícula ativa. Marque "Cobrança avulsa" ou matricule o aluno em um plano.' }
  }
  const plan = enr.plan as { name: string; amount: number; billing_type: string; early_pay_amount: number | null } | null
  const unit = enr.custom_amount != null ? Number(enr.custom_amount) : Number(plan?.amount ?? 0)

  if (plan?.billing_type === 'per_class') {
    const [y, m] = dueDate.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 1) // exclusivo
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .gte('start_datetime', monthStart.toISOString())
      .lt('start_datetime', monthEnd.toISOString())
      .in('status', ATTENDED_STATUSES)
    const count = lessons?.length ?? 0
    if (count === 0) return { error: 'Sem aulas realizadas no mês do vencimento para cobrar por aula.' }
    return { enrollmentId: enr.id, amount: unit * count, earlyPay: null, planName: plan?.name ?? null }
  }

  const earlyPay = enr.custom_amount == null && plan?.early_pay_amount != null ? Number(plan.early_pay_amount) : null
  return { enrollmentId: enr.id, amount: unit, earlyPay, planName: plan?.name ?? null }
}

export async function createCharge(
  _prev: CreateChargeState,
  formData: FormData,
): Promise<CreateChargeState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }
  const { features } = await getPlanContext()
  if (!features.financial) return { ok: false, error: 'Financeiro indisponível no seu plano.' }

  const avulsa = formData.get('avulsa') === 'on'
  const studentId = String(formData.get('studentId') ?? '')
  const dueDate = String(formData.get('dueDate') ?? '')
  if (!/^[0-9a-f-]{32,36}$/i.test(studentId)) return { ok: false, fieldErrors: { studentId: 'Selecione o aluno.' } }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, fieldErrors: { dueDate: 'Data inválida.' } }

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

  let row: ChargeInsert
  let planName: string | null = null

  if (avulsa) {
    const amount = Number(formData.get('amount'))
    const description = String(formData.get('description') ?? '').trim()
    if (!(amount > 0)) return { ok: false, fieldErrors: { amount: 'Informe um valor maior que zero.' } }
    if (amount > 1_000_000) return { ok: false, fieldErrors: { amount: 'Valor muito alto.' } }
    row = { school_id: me.schoolId, student_id: studentId, enrollment_id: null, amount, early_pay_amount: null, due_date: dueDate, status: 'pending', description: description || null }
    planName = description || null
  } else {
    const resolved = await resolvePlanCharge(supabase, me.schoolId, studentId, dueDate)
    if ('error' in resolved) return { ok: false, fieldErrors: { studentId: resolved.error } }
    row = { school_id: me.schoolId, student_id: null, enrollment_id: resolved.enrollmentId, amount: resolved.amount, early_pay_amount: resolved.earlyPay, due_date: dueDate, status: 'pending', description: null }
    planName = resolved.planName
  }

  const { data: inserted, error } = await supabase.from('charges').insert(row).select('id').single()
  if (error || !inserted) {
    if (error?.code === '23505') return { ok: false, error: 'Já existe uma cobrança para esse aluno nesse vencimento.' }
    return { ok: false, error: 'Não foi possível criar a cobrança.' }
  }

  // Notifica o aluno com o link de pagamento (PIX). Não bloqueia a criação.
  await notify('charge.created', studentId, {
    amount: row.amount,
    dueDate: new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
    planName,
    payUrl: `${appBaseUrl()}/pagar/${inserted.id}`,
  }, { relatedId: inserted.id }).catch(() => {})

  revalidatePath('/financial')
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
