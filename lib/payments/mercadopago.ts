import type {
  CheckoutRequest, CheckoutResult, PaymentProvider, PaymentStatus, ProviderPayment,
  ProviderSubscription, SubscriptionRequest, SubscriptionResult, SubscriptionStatus,
} from '@/lib/payments/types'

// Adapter Mercado Pago (Checkout Pro). Usa o Access Token (teste ou produção)
// via MP_ACCESS_TOKEN. Sem SDK — só fetch na API REST.
const MP_API = 'https://api.mercadopago.com'

function mapSubStatus(s: string): SubscriptionStatus {
  switch (s) {
    case 'authorized':
      return 'authorized'
    case 'pending':
      return 'pending'
    case 'paused':
      return 'paused'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function mapStatus(s: string): PaymentStatus {
  switch (s) {
    case 'approved':
      return 'approved'
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    default:
      return 'unknown'
  }
}

export function mercadoPagoProvider(token: string): PaymentProvider {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  return {
    name: 'mercadopago',

    async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
      const body = {
        items: [
          {
            title: req.title,
            quantity: 1,
            unit_price: Number(req.amount),
            currency_id: 'BRL',
          },
        ],
        payer: req.payerEmail ? { email: req.payerEmail } : undefined,
        external_reference: req.externalReference,
        back_urls: { success: req.successUrl, failure: req.failureUrl, pending: req.pendingUrl },
        auto_return: 'approved',
        notification_url: req.notificationUrl,
      }
      const res = await fetch(`${MP_API}/checkout/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Mercado Pago createCheckout falhou (${res.status}): ${detail.slice(0, 300)}`)
      }
      const data = (await res.json()) as { id: string; init_point: string; sandbox_init_point?: string }
      return { checkoutUrl: data.init_point, preferenceId: data.id }
    },

    async getPayment(paymentId: string): Promise<ProviderPayment | null> {
      const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, { headers })
      if (!res.ok) return null
      const p = (await res.json()) as {
        id: number; status: string; external_reference: string | null; transaction_amount: number | null
      }
      return {
        paymentId: String(p.id),
        status: mapStatus(p.status),
        externalReference: p.external_reference,
        amount: p.transaction_amount,
      }
    },

    async createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult> {
      // Base comum. Com card token → transparente (autoriza na hora). Sem token →
      // hospedado (MP devolve init_point pra cadastrar o cartão).
      const body: Record<string, unknown> = {
        reason: req.reason,
        external_reference: req.externalReference,
        payer_email: req.payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: Number(req.amount),
          currency_id: 'BRL',
        },
        back_url: req.backUrl,
      }
      if (req.cardTokenId) {
        body.card_token_id = req.cardTokenId
        body.status = 'authorized'
      }
      const res = await fetch(`${MP_API}/preapproval`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Mercado Pago createSubscription falhou (${res.status}): ${detail.slice(0, 300)}`)
      }
      const data = (await res.json()) as { id: string; status: string; init_point?: string }
      return { subscriptionId: data.id, status: mapSubStatus(data.status), initPoint: data.init_point ?? null }
    },

    async getSubscription(subscriptionId: string): Promise<ProviderSubscription | null> {
      const res = await fetch(`${MP_API}/preapproval/${subscriptionId}`, { headers })
      if (!res.ok) return null
      const s = (await res.json()) as {
        id: string; status: string; external_reference: string | null
        next_payment_date?: string | null
      }
      return {
        subscriptionId: s.id,
        status: mapSubStatus(s.status),
        externalReference: s.external_reference,
        nextChargeDate: s.next_payment_date ? s.next_payment_date.slice(0, 10) : null,
      }
    },

    async subscriptionIdFromCharge(chargeId: string): Promise<string | null> {
      const res = await fetch(`${MP_API}/authorized_payments/${chargeId}`, { headers })
      if (!res.ok) return null
      const d = (await res.json()) as { preapproval_id?: string | null }
      return d.preapproval_id ?? null
    },
  }
}
