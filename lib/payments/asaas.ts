import type {
  CheckoutRequest, CheckoutResult, PaymentProvider, PaymentStatus, ProviderPayment,
  ProviderSubscription, SubscriptionRequest, SubscriptionResult, SubscriptionStatus,
} from '@/lib/payments/types'
import { dateInBR } from '@/lib/timezone'

// Adapter Asaas. Usa a API Key (sandbox ou produção) via ASAAS_API_KEY.
// Sem SDK — só fetch na API REST, mesmo padrão do adapter Mercado Pago.
//
// Mapeamento de conceitos:
//   createCheckout      → POST /v3/paymentLinks (link de pagamento hospedado, avulso)
//   getPayment          → GET  /v3/payments/{id}
//   createSubscription  → POST /v3/customers (find-or-create) + POST /v3/subscriptions
//   getSubscription     → GET  /v3/subscriptions/{id}
//   subscriptionIdFromCharge → GET /v3/payments/{id} → campo `subscription`
//
// Sandbox: ASAAS_ENV=sandbox → https://api-sandbox.asaas.com/v3

function apiBase(): string {
  return process.env.ASAAS_ENV === 'sandbox'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3'
}

// https://docs.asaas.com → status de cobrança
function mapStatus(s: string): PaymentStatus {
  switch (s) {
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'approved'
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
    case 'OVERDUE':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'pending'
    case 'REFUNDED':
      return 'refunded'
    case 'PARTIALLY_REFUNDED':
      // Estorno parcial não equivale à reversão integral do plano.
      return 'approved'
    case 'DELETED':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function mapSubStatus(s: string): SubscriptionStatus {
  switch (s) {
    case 'ACTIVE':
      return 'authorized'
    case 'INACTIVE':
    case 'EXPIRED':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

interface AsaasCustomer {
  id: string
}

interface AsaasPayment {
  id: string
  status: string
  externalReference: string | null
  value: number | null
  subscription?: string | null
  invoiceUrl?: string | null
}

interface AsaasSubscription {
  id: string
  status: string
  externalReference: string | null
  nextDueDate: string | null
}

export function asaasProvider(apiKey: string): PaymentProvider {
  const headers = { access_token: apiKey, 'Content-Type': 'application/json' }
  const base = apiBase()

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Asaas ${method} ${path} falhou (${res.status}): ${detail.slice(0, 300)}`)
    }
    return (await res.json()) as T
  }

  // Find-or-create do cliente Asaas pelo externalReference (school id) ou e-mail.
  async function ensureCustomer(req: SubscriptionRequest): Promise<string> {
    const found = await call<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?externalReference=${encodeURIComponent(req.externalReference)}&limit=1`,
    ).catch(() => null)
    if (found?.data?.[0]?.id) return found.data[0].id

    const byEmail = await call<{ data: AsaasCustomer[] }>(
      'GET',
      `/customers?email=${encodeURIComponent(req.payerEmail)}&limit=1`,
    ).catch(() => null)
    if (byEmail?.data?.[0]?.id) return byEmail.data[0].id

    const created = await call<AsaasCustomer>('POST', '/customers', {
      name: req.reason,
      email: req.payerEmail,
      externalReference: req.externalReference,
    })
    return created.id
  }

  return {
    name: 'asaas',

    async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
      // Link de pagamento hospedado: não exige customer nem CPF antecipado —
      // o pagador preenche os dados na página da Asaas.
      const data = await call<{ id: string; url: string }>('POST', '/paymentLinks', {
        name: req.title,
        billingType: 'UNDEFINED', // pagador escolhe Pix/boleto/cartão
        chargeType: 'DETACHED',
        value: Number(req.amount),
        externalReference: req.externalReference,
        callback: { successUrl: req.successUrl, autoRedirect: true },
      })
      return { checkoutUrl: data.url, preferenceId: data.id }
    },

    async getPayment(paymentId: string): Promise<ProviderPayment | null> {
      const res = await fetch(`${base}/payments/${paymentId}`, { headers })
      if (!res.ok) return null
      const p = (await res.json()) as AsaasPayment
      return {
        paymentId: p.id,
        status: mapStatus(p.status),
        externalReference: p.externalReference,
        amount: p.value,
        subscriptionId: p.subscription ?? null,
      }
    },

    async createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult> {
      const customerId = await ensureCustomer(req)
      const today = dateInBR()

      const body: Record<string, unknown> = {
        customer: customerId,
        value: Number(req.amount),
        nextDueDate: today,
        cycle: 'MONTHLY',
        description: req.reason,
        externalReference: req.externalReference,
      }
      if (req.cardTokenId) {
        // Transparente: token gerado no front (tokenização JS da Asaas).
        body.billingType = 'CREDIT_CARD'
        body.creditCardToken = req.cardTokenId
      } else {
        // Hospedado: a Asaas gera a 1ª cobrança e devolvemos a invoiceUrl
        // como "initPoint" (pagador escolhe Pix/boleto/cartão na página Asaas).
        body.billingType = 'UNDEFINED'
      }

      const sub = await call<AsaasSubscription>('POST', '/subscriptions', body)

      let initPoint: string | null = null
      if (!req.cardTokenId) {
        const payments = await call<{ data: AsaasPayment[] }>(
          'GET',
          `/subscriptions/${sub.id}/payments?limit=1`,
        ).catch(() => null)
        initPoint = payments?.data?.[0]?.invoiceUrl ?? null
      }

      return {
        subscriptionId: sub.id,
        // Asaas cria a assinatura ACTIVE, mas o acesso só libera quando o
        // webhook confirmar o pagamento (reconcile). Sem token → pending.
        status: req.cardTokenId ? mapSubStatus(sub.status) : 'pending',
        initPoint,
      }
    },

    async getSubscription(subscriptionId: string): Promise<ProviderSubscription | null> {
      const res = await fetch(`${base}/subscriptions/${subscriptionId}`, { headers })
      if (!res.ok) return null
      const s = (await res.json()) as AsaasSubscription
      return {
        subscriptionId: s.id,
        status: mapSubStatus(s.status),
        externalReference: s.externalReference,
        nextChargeDate: s.nextDueDate ? s.nextDueDate.slice(0, 10) : null,
      }
    },

    async subscriptionIdFromCharge(chargeId: string): Promise<string | null> {
      const res = await fetch(`${base}/payments/${chargeId}`, { headers })
      if (!res.ok) return null
      const p = (await res.json()) as AsaasPayment
      return p.subscription ?? null
    },
  }
}
