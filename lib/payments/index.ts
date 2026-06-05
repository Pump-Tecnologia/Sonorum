import { mercadoPagoProvider } from '@/lib/payments/mercadopago'
import { mockPaymentProvider } from '@/lib/payments/mock'
import type { PaymentProvider } from '@/lib/payments/types'

export type {
  CheckoutRequest, CheckoutResult, PaymentProvider, ProviderPayment, PaymentStatus,
  SubscriptionRequest, SubscriptionResult, ProviderSubscription, SubscriptionStatus,
} from '@/lib/payments/types'

// Escolhe o provider: se há MP_ACCESS_TOKEN (e o provider não foi forçado pra
// mock), usa Mercado Pago real; senão cai no mock (dev sem credencial).
export function getPaymentProvider(): PaymentProvider {
  const forced = process.env.PAYMENTS_PROVIDER
  const token = process.env.MP_ACCESS_TOKEN
  if (forced === 'mock') return mockPaymentProvider()
  if (token) return mercadoPagoProvider(token)
  return mockPaymentProvider()
}

// Base URL absoluta pra montar back_urls / notification_url.
export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://app.sonorum.com.br'
}
