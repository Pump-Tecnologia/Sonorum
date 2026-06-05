import type {
  CheckoutRequest, CheckoutResult, PaymentProvider, ProviderPayment,
  ProviderSubscription, SubscriptionRequest, SubscriptionResult,
} from '@/lib/payments/types'

// Provider de desenvolvimento: não chama gateway externo. O "checkout" é uma
// página interna que simula a aprovação. Permite construir/validar o fluxo
// (criar cobrança → conciliar → estender validade) sem credencial real.
export function mockPaymentProvider(): PaymentProvider {
  return {
    name: 'mock',
    async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
      const preferenceId = `mock_${req.externalReference}`
      // redireciona pra própria successUrl com um payment_id fake aprovável
      const url = new URL(req.successUrl)
      url.searchParams.set('mock_payment_id', preferenceId)
      return { checkoutUrl: url.toString(), preferenceId }
    },
    async getPayment(paymentId: string): Promise<ProviderPayment> {
      return { paymentId, status: 'approved', externalReference: paymentId.replace(/^mock_/, ''), amount: null }
    },
    async createSubscription(req: SubscriptionRequest): Promise<SubscriptionResult> {
      // Sem token (hospedado) devolve um init_point que cai na tela de retorno.
      const initPoint = req.cardTokenId ? null : `${req.backUrl}${req.backUrl.includes('?') ? '&' : '?'}status=sucesso`
      return { subscriptionId: `mocksub_${req.externalReference}`, status: 'authorized', initPoint }
    },
    async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
      return { subscriptionId, status: 'authorized', externalReference: subscriptionId.replace(/^mocksub_/, ''), nextChargeDate: null }
    },
    async subscriptionIdFromCharge(chargeId: string): Promise<string | null> {
      return chargeId
    },
  }
}
