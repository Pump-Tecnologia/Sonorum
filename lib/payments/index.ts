import { mercadoPagoProvider } from '@/lib/payments/mercadopago'
import { mockPaymentProvider } from '@/lib/payments/mock'
import type { PaymentProvider } from '@/lib/payments/types'

export type {
  CheckoutRequest, CheckoutResult, PaymentProvider, ProviderPayment, PaymentStatus,
  SubscriptionRequest, SubscriptionResult, ProviderSubscription, SubscriptionStatus,
} from '@/lib/payments/types'

// Escolhe o provider: com MP_ACCESS_TOKEN → Mercado Pago real; sem token → mock,
// MAS o mock é PROIBIDO em produção (senão "pagamento" fake ativaria planos de
// graça). Em produção sem token, lança erro — o checkout falha de forma segura.
export function getPaymentProvider(): PaymentProvider {
  const forced = process.env.PAYMENTS_PROVIDER
  const token = process.env.MP_ACCESS_TOKEN
  if (token && forced !== 'mock') return mercadoPagoProvider(token)

  const isProd = process.env.VERCEL_ENV === 'production'
  if (isProd && forced !== 'mock') {
    throw new Error('Pagamento indisponível: gateway não configurado em produção.')
  }
  return mockPaymentProvider()
}

// Base URL absoluta pra montar back_urls / notification_url.
export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://app.sonorum.com.br'
}
