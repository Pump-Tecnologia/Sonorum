import type {
  CheckoutRequest, CheckoutResult, PaymentProvider, PaymentStatus, ProviderPayment,
} from '@/lib/payments/types'

// Adapter Mercado Pago (Checkout Pro). Usa o Access Token (teste ou produção)
// via MP_ACCESS_TOKEN. Sem SDK — só fetch na API REST.
const MP_API = 'https://api.mercadopago.com'

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
  }
}
