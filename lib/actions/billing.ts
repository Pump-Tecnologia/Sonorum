'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { SELLABLE_PLANS, planPrice } from '@/lib/constants/plans'
import { appBaseUrl, getPaymentProvider } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

export type CheckoutActionState = { ok: boolean; error?: string; url?: string }
export type SubscribeResult = { ok: boolean; error?: string; status?: string }

function addOneMonth(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const targetLast = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(d ?? 1, targetLast)).toISOString().slice(0, 10)
}

// Valida o plano escolhido (Profissional/Premium) e carrega escola + preço.
async function resolvePlan(planTypeRaw: string) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { error: 'Acesso negado.' as const }
  if (!SELLABLE_PLANS.includes(planTypeRaw as (typeof SELLABLE_PLANS)[number])) {
    return { error: 'Plano inválido.' as const }
  }
  const admin = await createAdminClient()
  const { data: school } = await admin
    .from('schools')
    .select('id, name, monthly_price, expiration_date')
    .eq('id', me.schoolId)
    .maybeSingle()
  if (!school) return { error: 'Escola não encontrada.' as const }
  const amount = planPrice(planTypeRaw, school.monthly_price)
  if (amount <= 0) return { error: 'Plano sem preço configurado.' as const }
  return { me, admin, school, planType: planTypeRaw, amount }
}

// Checkout AVULSO (Pix/boleto/cartão único) do plano escolhido.
export async function startSaasCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const r = await resolvePlan(String(formData.get('planType') ?? ''))
  if ('error' in r) return { ok: false, error: r.error }
  const { me, admin, school, planType, amount } = r

  const periodStart = new Date().toISOString().slice(0, 10)
  const externalReference = `${school.id}:${planType}:${periodStart}`
  const { data: payment, error: insErr } = await admin
    .from('saas_payments')
    .insert({ school_id: school.id, plan_type: planType, amount, provider: getPaymentProvider().name, external_reference: externalReference, status: 'pending', period_start: periodStart })
    .select('id')
    .single()
  if (insErr || !payment) return { ok: false, error: 'Não foi possível iniciar o pagamento.' }

  const base = appBaseUrl()
  try {
    const checkout = await getPaymentProvider().createCheckout({
      schoolId: school.id, planType, amount,
      title: `Sonorum — plano ${planType} (${school.name})`,
      payerEmail: me.email ?? null,
      externalReference,
      successUrl: `${base}/billing/retorno?status=sucesso`,
      failureUrl: `${base}/billing/retorno?status=falha`,
      pendingUrl: `${base}/billing/retorno?status=pendente`,
      notificationUrl: `${base}/api/webhooks/mercadopago`,
    })
    await admin.from('saas_payments').update({ provider_preference_id: checkout.preferenceId, updated_at: new Date().toISOString() }).eq('id', payment.id)
    return { ok: true, url: checkout.checkoutUrl }
  } catch (e) {
    await admin.from('saas_payments').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', payment.id)
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao criar o checkout.' }
  }
}

// Núcleo do checkout de assinatura hospedada para o admin logado + plano dado.
// Reusado pela action do /upgrade E pelo cadastro com plano (funil da landing).
export async function subscriptionCheckout(planTypeRaw: string): Promise<CheckoutActionState> {
  const r = await resolvePlan(planTypeRaw)
  if ('error' in r) return { ok: false, error: r.error }
  const { me, admin, school, planType, amount } = r

  const { data: sub, error: subErr } = await admin
    .from('saas_subscriptions')
    .insert({ school_id: school.id, provider: getPaymentProvider().name, plan_type: planType, amount, status: 'pending' })
    .select('id')
    .single()
  if (subErr || !sub) return { ok: false, error: 'Não foi possível iniciar a assinatura.' }

  try {
    const result = await getPaymentProvider().createSubscription({
      schoolId: school.id, planType, amount,
      reason: `Sonorum — plano ${planType} (${school.name})`,
      payerEmail: me.email ?? '',
      externalReference: `${school.id}:${planType}:sub`,
      backUrl: `${appBaseUrl()}/billing/retorno?status=sucesso`,
    })
    await admin.from('saas_subscriptions').update({ provider_subscription_id: result.subscriptionId, updated_at: new Date().toISOString() }).eq('id', sub.id)
    if (!result.initPoint) return { ok: false, error: 'Não foi possível abrir o cadastro do cartão.' }
    return { ok: true, url: result.initPoint }
  } catch (e) {
    await admin.from('saas_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', sub.id)
    // Surfaça a causa real (admin-only) — ajuda a ver erros do gateway (ex.: back_url inválida no localhost).
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao iniciar a assinatura.' }
  }
}

// Action do /upgrade (form) — delega ao núcleo.
export async function startSaasSubscriptionCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  return subscriptionCheckout(String(formData.get('planType') ?? ''))
}

// Assinatura recorrente TRANSPARENTE (Bricks): token do cartão vem do cliente,
// sem redirect. Ativa na hora, troca o plano da escola e estende a validade.
export async function createSaasSubscription(input: {
  cardTokenId: string
  payerEmail: string
  planType: string
}): Promise<SubscribeResult> {
  if (!input.cardTokenId) return { ok: false, error: 'Cartão inválido.' }
  const r = await resolvePlan(input.planType)
  if ('error' in r) return { ok: false, error: r.error }
  const { me, admin, school, planType, amount } = r

  const { data: sub, error: subErr } = await admin
    .from('saas_subscriptions')
    .insert({ school_id: school.id, provider: getPaymentProvider().name, plan_type: planType, amount, status: 'pending' })
    .select('id')
    .single()
  if (subErr || !sub) return { ok: false, error: 'Não foi possível iniciar a assinatura.' }

  try {
    const result = await getPaymentProvider().createSubscription({
      schoolId: school.id, planType, amount,
      reason: `Sonorum — plano ${planType} (${school.name})`,
      payerEmail: input.payerEmail || me.email || '',
      cardTokenId: input.cardTokenId,
      externalReference: `${school.id}:${planType}:sub`,
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

    const today = new Date().toISOString().slice(0, 10)
    const current = school.expiration_date as string | null
    const base = current && current > today ? current : today
    await admin.from('schools').update({
      plan_type: planType,
      expiration_date: addOneMonth(base),
      updated_at: new Date().toISOString(),
    }).eq('id', school.id)

    return { ok: true, status: 'authorized' }
  } catch (e) {
    await admin.from('saas_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', sub.id)
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao criar a assinatura.' }
  }
}
