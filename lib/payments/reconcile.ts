import 'server-only'

import { getPaymentProvider } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

// Soma 1 mês a uma data (YYYY-MM-DD), preservando o dia (clamp no fim do mês).
function addOneMonth(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate() // último dia do mês corrente
  const targetLast = new Date(y, m + 1, 0).getDate() // último dia do próximo mês
  const day = Math.min(d ?? lastDay, targetLast)
  return new Date(y, m, day).toISOString().slice(0, 10)
}

export interface ReconcileResult {
  handled: boolean
  status?: string
  schoolId?: string
}

// Fonte da verdade: consulta o pagamento no gateway e, se aprovado, baixa o
// saas_payment e ESTENDE a validade da escola. Idempotente (não estende 2x).
export async function reconcilePayment(paymentId: string): Promise<ReconcileResult> {
  const provider = getPaymentProvider()
  const payment = await provider.getPayment(paymentId)
  if (!payment) return { handled: false }

  const admin = await createAdminClient()

  // Localiza nosso registro pela external_reference (ou pelo payment_id já gravado).
  const { data: row } = await admin
    .from('saas_payments')
    .select('id, school_id, status, period_end, plan_type')
    .or(`external_reference.eq.${payment.externalReference},provider_payment_id.eq.${payment.paymentId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return { handled: false, status: payment.status }

  // Idempotência: se já aprovado, não estende de novo.
  if (row.status === 'approved') return { handled: true, status: 'approved', schoolId: row.school_id }

  if (payment.status !== 'approved') {
    await admin
      .from('saas_payments')
      .update({ status: payment.status, provider_payment_id: payment.paymentId, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    return { handled: true, status: payment.status, schoolId: row.school_id }
  }

  // Aprovado → baixa + estende a validade da escola.
  const today = new Date().toISOString().slice(0, 10)
  const { data: school } = await admin
    .from('schools')
    .select('expiration_date')
    .eq('id', row.school_id)
    .maybeSingle()
  const current = school?.expiration_date as string | null
  const base = current && current > today ? current : today // se ainda válido, soma ao fim; senão, de hoje
  const newExpiration = addOneMonth(base)

  await admin.from('saas_payments').update({
    status: 'approved',
    provider_payment_id: payment.paymentId,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id)

  await admin.from('schools').update({
    plan_type: row.plan_type,
    expiration_date: newExpiration,
    updated_at: new Date().toISOString(),
  }).eq('id', row.school_id)

  return { handled: true, status: 'approved', schoolId: row.school_id }
}

// Sincroniza uma ASSINATURA recorrente pelo preapproval id. Enquanto autorizada,
// a validade da escola acompanha o next_payment_date do gateway (rolling).
export async function reconcileSubscription(preapprovalId: string): Promise<ReconcileResult> {
  const provider = getPaymentProvider()
  const sub = await provider.getSubscription(preapprovalId)
  if (!sub) return { handled: false }

  const admin = await createAdminClient()
  const { data: row } = await admin
    .from('saas_subscriptions')
    .select('id, school_id, status, plan_type')
    .eq('provider_subscription_id', preapprovalId)
    .maybeSingle()
  if (!row) return { handled: false, status: sub.status }

  await admin.from('saas_subscriptions').update({
    status: sub.status === 'unknown' ? row.status : sub.status,
    next_charge_at: sub.nextChargeDate,
    cancelled_at: sub.status === 'cancelled' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', row.id)

  // Autorizada → troca o plano e valida a escola (até a próxima cobrança, ou +1
  // mês se o gateway ainda não informou a data).
  if (sub.status === 'authorized') {
    const today = new Date().toISOString().slice(0, 10)
    const until = sub.nextChargeDate ?? addOneMonth(today)
    await admin.from('schools').update({
      plan_type: row.plan_type,
      expiration_date: until,
      updated_at: new Date().toISOString(),
    }).eq('id', row.school_id)
  }

  return { handled: true, status: sub.status, schoolId: row.school_id }
}

// Cobrança recorrente individual (authorized_payment) → resolve a assinatura e
// sincroniza (a validade acompanha o next_payment_date).
export async function reconcileSubscriptionCharge(chargeId: string): Promise<ReconcileResult> {
  const provider = getPaymentProvider()
  const preapprovalId = await provider.subscriptionIdFromCharge(chargeId)
  if (!preapprovalId) return { handled: false }
  return reconcileSubscription(preapprovalId)
}
