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

export interface PaymentProvider {
  readonly name: string
  // Cria o checkout hospedado e devolve a URL pra redirecionar o pagador.
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>
  // Consulta um pagamento pela id do gateway (fonte da verdade no webhook).
  getPayment(paymentId: string): Promise<ProviderPayment | null>
}
