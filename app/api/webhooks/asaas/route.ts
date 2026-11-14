import { NextResponse, type NextRequest } from 'next/server'

import { reconcilePayment, reconcileStudentCharge, reconcileSubscription } from '@/lib/payments/reconcile'
import { clientIp, rateLimit } from '@/lib/security/rate-limit'
import { safeEqual } from '@/lib/security/compare'

// Webhook da Asaas. Envia JSON { event, payment: { id, subscription? } }.
// Mesmo princípio do webhook do MP: não confiamos no corpo — extraímos só as
// ids e RE-CONSULTAMOS o recurso na API da Asaas (fonte da verdade) dentro do
// reconcile, que é idempotente.
//
// Autenticação: a Asaas manda o header `asaas-access-token` com o token
// configurado no painel (Integrações → Webhooks). Com ASAAS_WEBHOOK_TOKEN no
// env, validamos; sem o env var, segue só com o re-fetch (não quebra o
// ambiente até o segredo ser provisionado).
//
// Eventos relevantes: PAYMENT_CONFIRMED / PAYMENT_RECEIVED (aprova),
// PAYMENT_REFUNDED / PAYMENT_DELETED / PAYMENT_OVERDUE (sincroniza status).
export async function POST(request: NextRequest) {
  const rl = await rateLimit(`aswh:${await clientIp()}`, 300, 5 * 60 * 1000)
  if (!rl.ok) return NextResponse.json({ error: 'rate limited' }, { status: 429 })

  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === 'production'
    : process.env.NODE_ENV === 'production'
  if (isProduction && !webhookToken) {
    return NextResponse.json({ error: 'webhook authentication is not configured' }, { status: 503 })
  }
  if (webhookToken && !safeEqual(request.headers.get('asaas-access-token') ?? '', webhookToken)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  let event: string | null = null
  let paymentId: string | null = null
  let subscriptionId: string | null = null
  let paymentValue: number | undefined
  let paymentBillingType: string | undefined
  let paymentExternalRef: string | null = null
  try {
    const body = (await request.json()) as {
      event?: string
      payment?: {
        id?: string
        subscription?: string | null
        value?: number
        billingType?: string
        externalReference?: string | null
      }
      subscription?: { id?: string }
    }
    event = body.event ?? null
    paymentId = body.payment?.id ?? null
    subscriptionId = body.payment?.subscription ?? body.subscription?.id ?? null
    paymentValue = body.payment?.value
    paymentBillingType = body.payment?.billingType
    paymentExternalRef = body.payment?.externalReference ?? null
  } catch {
    return NextResponse.json({ ignored: true })
  }

  if (!paymentId && !subscriptionId) return NextResponse.json({ ignored: true })

  try {
    // ACTIVE descreve a assinatura, mas não confirma sua primeira cobrança.
    // Só eventos financeiros confirmados liberam/renovam acesso.
    if (subscriptionId && paymentId && (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED')) {
      await reconcileSubscription(subscriptionId, { confirmedPaymentId: paymentId })
    }
    // Pagamento avulso: tenta conciliar como SaaS payment; se não for, concilia como mensalidade do aluno.
    if (paymentId && !subscriptionId) {
      const saasRes = await reconcilePayment(paymentId)
      if (!saasRes.handled && event) {
        await reconcileStudentCharge(paymentId, event, {
          value: paymentValue,
          billingType: paymentBillingType,
          externalReference: paymentExternalRef,
        })
      }
    }
  } catch {
    // 200 mesmo em erro evita a fila de retentativas da Asaas travar por bug
    // nosso (a Asaas PAUSA a fila após falhas consecutivas); o reconcile é
    // idempotente e pode ser reprocessado.
    return NextResponse.json({ received: true, event })
  }
  return NextResponse.json({ received: true, event })
}

// Validação manual da URL.
export async function GET() {
  return NextResponse.json({ ok: true })
}
