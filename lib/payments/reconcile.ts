import 'server-only'

import { notify } from '@/lib/notifications/notify'
import { getPaymentProvider } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'
import { dateInBR } from '@/lib/timezone'

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
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(paymentId)) return { handled: false }
  const provider = getPaymentProvider()
  const payment = await provider.getPayment(paymentId)
  if (!payment) return { handled: false }

  const admin = await createAdminClient()

  // Payment ID é a chave mais forte. Só recorremos à referência quando ainda
  // não temos esse vínculo, e falhamos fechados se dados legados forem ambíguos.
  const { data: linkedRow } = await admin
    .from('saas_payments')
    .select('id, school_id, status, period_end, plan_type, amount, provider, external_reference')
    .eq('provider_payment_id', payment.paymentId)
    .maybeSingle()

  let row = linkedRow
  if (!row && payment.externalReference) {
    const { data: matches } = await admin
      .from('saas_payments')
      .select('id, school_id, status, period_end, plan_type, amount, provider, external_reference')
      .eq('external_reference', payment.externalReference)
      .limit(2)
    if ((matches?.length ?? 0) > 1) return { handled: false, status: 'ambiguous_reference' }
    row = matches?.[0] ?? null
  }

  if (!row) return { handled: false, status: payment.status }
  if (row.provider !== provider.name) return { handled: false, status: 'provider_mismatch' }

  // Só ativamos quando a quantia consultada diretamente no gateway coincide
  // com o valor registrado no início do checkout.
  if (payment.status === 'approved') {
    const expectedCents = Math.round(Number(row.amount) * 100)
    const receivedCents = payment.amount == null ? null : Math.round(payment.amount * 100)
    if (receivedCents == null || receivedCents !== expectedCents) {
      return { handled: false, status: 'amount_mismatch' }
    }
    if (payment.externalReference && payment.externalReference !== row.external_reference) {
      return { handled: false, status: 'reference_mismatch' }
    }
  }

  // Idempotência: se já aprovado, não estende de novo.
  if (row.status === 'approved' && payment.status === 'approved') {
    return { handled: true, status: 'approved', schoolId: row.school_id }
  }

  if (payment.status !== 'approved') {
    if (payment.status === 'unknown') return { handled: false, status: payment.status }

    const { data: conflict, error: conflictError } = await admin
      .from('saas_payments')
      .select('id')
      .eq('provider_payment_id', payment.paymentId)
      .neq('id', row.id)
      .limit(1)
    if (conflictError) throw conflictError
    if (conflict?.length) return { handled: false, status: 'payment_id_conflict', schoolId: row.school_id }

    // Notificações antigas não podem regredir uma cobrança já aprovada ou
    // reembolsada. Reembolso integral pode encerrar um pagamento aprovado;
    // estados intermediários só atualizam cobranças ainda não aprovadas.
    const eligibleStatuses = payment.status === 'refunded'
      ? ['pending', 'rejected', 'cancelled', 'approved']
      : ['pending', 'rejected', 'cancelled']
    const { data: updated, error } = await admin
      .from('saas_payments')
      .update({ status: payment.status, provider_payment_id: payment.paymentId, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .in('status', eligibleStatuses)
      .select('status')
      .maybeSingle()
    if (error) throw error
    if (updated) return { handled: true, status: updated.status, schoolId: row.school_id }

    const { data: current, error: readError } = await admin
      .from('saas_payments')
      .select('status')
      .eq('id', row.id)
      .maybeSingle()
    if (readError) throw readError
    return { handled: Boolean(current), status: current?.status ?? 'not_found', schoolId: row.school_id }
  }

  // Uma única transação bloqueia a cobrança e atualiza a escola. Webhooks
  // duplicados/concurrentes não estendem a validade duas vezes.
  const { data, error } = await admin.rpc('approve_saas_payment', {
    p_payment_id: row.id,
    p_provider_payment_id: payment.paymentId,
  })
  if (error) throw error
  const result = data as { handled?: boolean; status?: string; school_id?: string } | null
  return {
    handled: result?.handled === true,
    status: result?.status ?? 'unknown',
    schoolId: result?.school_id ?? row.school_id,
  }
}

// Sincroniza uma ASSINATURA recorrente pelo preapproval id. Enquanto autorizada,
// a validade da escola acompanha o next_payment_date do gateway (rolling).
export async function reconcileSubscription(
  preapprovalId: string,
  options: { confirmedPaymentId?: string } = {},
): Promise<ReconcileResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(preapprovalId)) return { handled: false }
  const provider = getPaymentProvider()
  const sub = await provider.getSubscription(preapprovalId)
  if (!sub) return { handled: false }

  const admin = await createAdminClient()
  let { data: row } = await admin
    .from('saas_subscriptions')
    .select('id, school_id, status, plan_type, provider_subscription_id, amount')
    .eq('provider_subscription_id', preapprovalId)
    .maybeSingle()

  // Se o webhook chegar entre a criação no gateway e a gravação do ID local,
  // recupera a linha pelo UUID interno incluído na referência da tentativa.
  if (!row && sub.externalReference) {
    const localRef = sub.externalReference.match(/^([0-9a-f-]{36}):([^:]+):sub:([0-9a-f-]{36})$/i)
    if (localRef) {
      const recovered = await admin
        .from('saas_subscriptions')
        .select('id, school_id, status, plan_type, provider_subscription_id, amount')
        .eq('id', localRef[3])
        .eq('school_id', localRef[1])
        .eq('plan_type', localRef[2])
        .eq('provider', provider.name)
        .maybeSingle()
      row = recovered.data
    }
  }
  if (!row) return { handled: false, status: sub.status }

  // Asaas pode criar o recurso ACTIVE antes de confirmar a primeira cobrança.
  // Reconsultamos a cobrança e conferimos estado, vínculo e valor antes de ativar.
  if (provider.name === 'asaas' && sub.status === 'authorized') {
    const firstCharge = options.confirmedPaymentId
      ? await provider.getPayment(options.confirmedPaymentId)
      : null
    const expectedCents = Math.round(Number(row.amount) * 100)
    const receivedCents = firstCharge?.amount == null ? null : Math.round(firstCharge.amount * 100)
    if (
      !firstCharge || firstCharge.status !== 'approved' ||
      firstCharge.subscriptionId !== preapprovalId || receivedCents !== expectedCents
    ) {
      return { handled: true, status: 'awaiting_payment', schoolId: row.school_id }
    }
  }

  const subscriptionUpdate: {
    provider_subscription_id: string
    status: string
    next_charge_at: string | null
    updated_at: string
    cancelled_at?: string | null
  } = {
    provider_subscription_id: preapprovalId,
    status: sub.status === 'unknown' ? row.status : sub.status,
    next_charge_at: sub.nextChargeDate,
    updated_at: new Date().toISOString(),
  }
  if (sub.status === 'cancelled') subscriptionUpdate.cancelled_at = new Date().toISOString()
  else if (sub.status === 'authorized') subscriptionUpdate.cancelled_at = null

  const { error: subscriptionError } = await admin
    .from('saas_subscriptions')
    .update(subscriptionUpdate)
    .eq('id', row.id)
  if (subscriptionError) throw subscriptionError

  // Autorizada → troca o plano e valida a escola (até a próxima cobrança, ou +1
  // mês se o gateway ainda não informou a data).
  if (sub.status === 'authorized') {
    const today = dateInBR()
    const until = sub.nextChargeDate ?? addOneMonth(today)
    const { error: schoolError } = await admin.from('schools').update({
      plan_type: row.plan_type,
      expiration_date: until,
      updated_at: new Date().toISOString(),
    }).eq('id', row.school_id)
    if (schoolError) throw schoolError
  }

  return { handled: true, status: sub.status, schoolId: row.school_id }
}

// Cobrança recorrente individual (authorized_payment) → resolve a assinatura e
// sincroniza (a validade acompanha o next_payment_date).
export async function reconcileSubscriptionCharge(chargeId: string): Promise<ReconcileResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(chargeId)) return { handled: false }
  const provider = getPaymentProvider()
  const preapprovalId = await provider.subscriptionIdFromCharge(chargeId)
  if (!preapprovalId) return { handled: false }
  return reconcileSubscription(preapprovalId)
}

export interface ReconcileStudentChargeResult {
  handled: boolean
  chargeId?: string
  status?: string
}

// Conciliação de mensalidades dos alunos (cobranças na subconta Asaas da escola).
// Idempotente: atualiza o status de charges e notifica o aluno.
export async function reconcileStudentCharge(
  paymentId: string,
  event: string,
  paymentData?: { value?: number; billingType?: string; externalReference?: string | null },
): Promise<ReconcileStudentChargeResult> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(paymentId)) return { handled: false }

  const admin = await createAdminClient()

  // Procura a cobrança pelo ID de pagamento do gateway ou pelo externalReference (UUID de charges)
  let query = admin
    .from('charges')
    .select('id, amount, status, student_id, enrollment_id, school_id')

  if (paymentData?.externalReference && /^[0-9a-f-]{36}$/i.test(paymentData.externalReference)) {
    query = query.or(`asaas_charge_id.eq.${paymentId},id.eq.${paymentData.externalReference}`)
  } else {
    query = query.eq('asaas_charge_id', paymentId)
  }

  const { data: charge } = await query.maybeSingle()
  if (!charge) return { handled: false }

  // Idempotência para confirmação repetida
  if (charge.status === 'paid' && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED')) {
    return { handled: true, chargeId: charge.id, status: 'paid' }
  }

  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    const paidAmount = paymentData?.value != null ? Number(paymentData.value) : Number(charge.amount)
    const method = (paymentData?.billingType ?? 'pix').toLowerCase()

    await admin.from('charges').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: paidAmount,
      payment_method: method,
      asaas_status: event,
      asaas_charge_id: paymentId,
      updated_at: new Date().toISOString(),
    }).eq('id', charge.id)

    const studentId = charge.student_id
    if (studentId) {
      await notify('charge.paid', studentId, {
        amount: paidAmount,
        paymentMethod: method,
      }, { schoolId: charge.school_id, relatedId: charge.id })
    }

    return { handled: true, chargeId: charge.id, status: 'paid' }
  }

  if (event === 'PAYMENT_OVERDUE') {
    await admin.from('charges').update({
      asaas_status: 'OVERDUE',
      updated_at: new Date().toISOString(),
    }).eq('id', charge.id)
    return { handled: true, chargeId: charge.id, status: 'overdue' }
  }

  if (event === 'PAYMENT_REFUNDED') {
    await admin.from('charges').update({
      asaas_status: 'REFUNDED',
      updated_at: new Date().toISOString(),
    }).eq('id', charge.id)
    return { handled: true, chargeId: charge.id, status: 'refunded' }
  }

  return { handled: true, chargeId: charge.id }
}
