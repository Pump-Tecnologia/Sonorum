'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { appBaseUrl, getPaymentProvider } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

export type CheckoutActionState = { ok: boolean; error?: string; url?: string }
export type SubscribeResult = { ok: boolean; error?: string; status?: string }

// Soma 1 mês a uma data YYYY-MM-DD (clamp no fim do mês).
function addOneMonth(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const targetLast = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(d ?? 1, targetLast)).toISOString().slice(0, 10)
}

// Inicia o checkout da assinatura do SaaS (Escola → Sonorum). Cobra o
// schools.monthly_price (preço negociado, definido pelo superadmin) e devolve a
// URL do gateway pra UI redirecionar. O webhook é quem estende a validade.
export async function startSaasCheckout(
  _prev: CheckoutActionState,
  _formData: FormData,
): Promise<CheckoutActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const admin = await createAdminClient()
  const { data: school } = await admin
    .from('schools')
    .select('id, name, plan_type, monthly_price')
    .eq('id', me.schoolId)
    .maybeSingle()

  if (!school) return { ok: false, error: 'Escola não encontrada.' }
  const amount = Number(school.monthly_price ?? 0)
  if (amount <= 0) {
    return { ok: false, error: 'Nenhum valor de assinatura configurado. Fale com o suporte para definir seu plano.' }
  }

  const now = new Date()
  const periodStart = now.toISOString().slice(0, 10)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().slice(0, 10)
  const externalReference = `${school.id}:${school.plan_type}:${periodStart}`

  // Registra a tentativa (pending) antes de ir pro gateway.
  const { data: payment, error: insErr } = await admin
    .from('saas_payments')
    .insert({
      school_id: school.id,
      plan_type: school.plan_type,
      amount,
      provider: getPaymentProvider().name,
      external_reference: externalReference,
      status: 'pending',
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select('id')
    .single()
  if (insErr || !payment) return { ok: false, error: 'Não foi possível iniciar o pagamento.' }

  const base = appBaseUrl()
  try {
    const provider = getPaymentProvider()
    const checkout = await provider.createCheckout({
      schoolId: school.id,
      planType: school.plan_type,
      amount,
      title: `Sonorum — assinatura ${school.plan_type} (${school.name})`,
      payerEmail: me.email ?? null,
      externalReference,
      successUrl: `${base}/billing/retorno?status=sucesso`,
      failureUrl: `${base}/billing/retorno?status=falha`,
      pendingUrl: `${base}/billing/retorno?status=pendente`,
      notificationUrl: `${base}/api/webhooks/mercadopago`,
    })

    await admin
      .from('saas_payments')
      .update({ provider_preference_id: checkout.preferenceId, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    return { ok: true, url: checkout.checkoutUrl }
  } catch {
    await admin
      .from('saas_payments')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', payment.id)
    return { ok: false, error: 'Falha ao criar o checkout. Tente novamente.' }
  }
}

// Cria a ASSINATURA recorrente no cartão (preapproval), a partir do token gerado
// pelo Bricks no cliente — sem redirect. Pagamento recorre sozinho todo mês.
export async function createSaasSubscription(input: {
  cardTokenId: string
  payerEmail: string
}): Promise<SubscribeResult> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }
  if (!input.cardTokenId) return { ok: false, error: 'Cartão inválido.' }

  const admin = await createAdminClient()
  const { data: school } = await admin
    .from('schools')
    .select('id, name, plan_type, monthly_price, expiration_date')
    .eq('id', me.schoolId)
    .maybeSingle()
  if (!school) return { ok: false, error: 'Escola não encontrada.' }
  const amount = Number(school.monthly_price ?? 0)
  if (amount <= 0) return { ok: false, error: 'Nenhum valor de assinatura configurado. Fale com o suporte.' }

  const externalReference = `${school.id}:${school.plan_type}:sub`

  // Registro local da assinatura (pending → authorized).
  const { data: sub, error: subErr } = await admin
    .from('saas_subscriptions')
    .insert({
      school_id: school.id,
      provider: getPaymentProvider().name,
      plan_type: school.plan_type,
      amount,
      status: 'pending',
    })
    .select('id')
    .single()
  if (subErr || !sub) return { ok: false, error: 'Não foi possível iniciar a assinatura.' }

  try {
    const provider = getPaymentProvider()
    const result = await provider.createSubscription({
      schoolId: school.id,
      planType: school.plan_type,
      amount,
      reason: `Sonorum — assinatura ${school.plan_type} (${school.name})`,
      payerEmail: input.payerEmail || me.email || '',
      cardTokenId: input.cardTokenId,
      externalReference,
      backUrl: `${appBaseUrl()}/billing/retorno?status=sucesso`,
    })

    await admin.from('saas_subscriptions').update({
      provider_subscription_id: result.subscriptionId,
      status: result.status === 'authorized' ? 'authorized' : 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id)

    if (result.status !== 'authorized') {
      return { ok: false, error: 'A assinatura não foi autorizada. Verifique os dados do cartão.', status: result.status }
    }

    // Autorizada → estende a validade da escola já no 1º ciclo.
    const today = new Date().toISOString().slice(0, 10)
    const current = school.expiration_date as string | null
    const base = current && current > today ? current : today
    await admin.from('schools').update({
      expiration_date: addOneMonth(base),
      updated_at: new Date().toISOString(),
    }).eq('id', school.id)

    return { ok: true, status: 'authorized' }
  } catch {
    await admin.from('saas_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', sub.id)
    return { ok: false, error: 'Falha ao criar a assinatura. Tente novamente.' }
  }
}
