import { asaasProvider } from '@/lib/payments/asaas'
import { mockPaymentProvider } from '@/lib/payments/mock'
import type { PaymentProvider } from '@/lib/payments/types'

export type {
  CheckoutRequest, CheckoutResult, PaymentProvider, ProviderPayment, PaymentStatus,
  SubscriptionRequest, SubscriptionResult, ProviderSubscription, SubscriptionStatus,
} from '@/lib/payments/types'

// Escolhe o provider:
//   ASAAS_API_KEY (padrão)                  → Asaas
//   PAYMENTS_PROVIDER=mock                  → mock (apenas dev)
//   sem credencial em desenvolvimento       → mock
//   sem credencial em produção              → lança erro (falha fechada)
export function getPaymentProvider(): PaymentProvider {
  const forced = process.env.PAYMENTS_PROVIDER
  const asaasKey = process.env.ASAAS_API_KEY
  const isProd = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === 'production'
    : process.env.NODE_ENV === 'production'

  if (forced && !['asaas', 'mock'].includes(forced)) {
    throw new Error('PAYMENTS_PROVIDER inválido. Use asaas ou mock.')
  }
  if (forced === 'mock') {
    if (isProd) throw new Error('O gateway mock não pode ser usado em produção.')
    return mockPaymentProvider()
  }
  if (asaasKey) {
    return asaasProvider(asaasKey)
  }
  if (forced === 'asaas') {
    throw new Error('PAYMENTS_PROVIDER=asaas exige ASAAS_API_KEY configurada.')
  }

  if (isProd) {
    throw new Error('Pagamento indisponível: gateway Asaas não configurado em produção.')
  }
  return mockPaymentProvider()
}

// Base URL absoluta pra montar back_urls / notification_url.
export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://app.sonorum.com.br'
}
