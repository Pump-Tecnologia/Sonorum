// Abstração de gateway de pagamento (Escola → Sonorum, assinatura do SaaS).
// Provider plugável: mock (dev, sem credencial) | mercadopago (real).

export type PaymentStatus = 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded' | 'unknown'

export interface CheckoutRequest {
  schoolId: string
  planType: string
  amount: number
  title: string
  payerEmail?: string | null
  externalReference: string
  successUrl: string
  failureUrl: string
  pendingUrl: string
  notificationUrl: string
}

export interface CheckoutResult {
  checkoutUrl: string
  preferenceId: string | null
}

export interface ProviderPayment {
  paymentId: string
  status: PaymentStatus
  externalReference: string | null
  amount: number | null
}

export type SubscriptionStatus = 'authorized' | 'pending' | 'paused' | 'cancelled' | 'unknown'

export interface SubscriptionRequest {
  schoolId: string
  planType: string
  amount: number
  reason: string
  payerEmail: string
  cardTokenId: string // token do cartão gerado pelo Bricks no cliente
  externalReference: string
  backUrl: string
}

export interface SubscriptionResult {
  subscriptionId: string
  status: SubscriptionStatus
}

export interface ProviderSubscription {
  subscriptionId: string
  status: SubscriptionStatus
  externalReference: string | null
  nextChargeDate: string | null
}

export interface PaymentProvider {
  readonly name: string
  // Cria o checkout hospedado e devolve a URL pra redirecionar o pagador (avulso).
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>
  // Consulta um pagamento pela id do gateway (fonte da verdade no webhook).
  getPayment(paymentId: string): Promise<ProviderPayment | null>
  // Cria a assinatura recorrente (cartão recorrente, sem redirect).
  createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult>
  // Consulta o estado de uma assinatura.
  getSubscription(subscriptionId: string): Promise<ProviderSubscription | null>
  // Resolve a id da assinatura a partir de uma cobrança recorrente (webhook).
  subscriptionIdFromCharge(chargeId: string): Promise<string | null>
}
