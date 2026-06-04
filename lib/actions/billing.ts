'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { appBaseUrl, getPaymentProvider } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

export type CheckoutActionState = { ok: boolean; error?: string; url?: string }

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
