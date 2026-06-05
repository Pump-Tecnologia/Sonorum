import { NextResponse, type NextRequest } from 'next/server'

import { reconcilePayment, reconcileSubscription, reconcileSubscriptionCharge } from '@/lib/payments/reconcile'

// Webhook do Mercado Pago. O MP avisa via query (?type=...&data.id=) ou body
// ({ type, data: { id } }). Não confiamos no corpo: extraímos a id + o tipo e
// RE-CONSULTAMOS o recurso na API (fonte da verdade) dentro do reconcile.
//   payment                        → cobrança avulsa (Pix/boleto/cartão único)
//   subscription_preapproval       → mudança de status da assinatura
//   subscription_authorized_payment→ cobrança recorrente mensal
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl
  let id = searchParams.get('data.id') ?? searchParams.get('id')
  let type = searchParams.get('type') ?? searchParams.get('topic')

  if (!id || !type) {
    try {
      const body = (await request.json()) as { type?: string; data?: { id?: string } }
      type = type ?? body.type ?? null
      id = id ?? body.data?.id ?? null
    } catch {
      // sem corpo JSON — segue com a query
    }
  }

  if (!id) return NextResponse.json({ ignored: true })

  try {
    if (type === 'subscription_preapproval') await reconcileSubscription(id)
    else if (type === 'subscription_authorized_payment') await reconcileSubscriptionCharge(id)
    else if (type === 'payment' || !type) await reconcilePayment(id)
    else return NextResponse.json({ ignored: true })
  } catch {
    // 200 mesmo em erro evita retentativa infinita do MP por bug nosso;
    // o reconcile é idempotente e pode ser reprocessado.
    return NextResponse.json({ received: true })
  }
  return NextResponse.json({ received: true })
}

// MP às vezes valida a URL com GET.
export async function GET() {
  return NextResponse.json({ ok: true })
}
