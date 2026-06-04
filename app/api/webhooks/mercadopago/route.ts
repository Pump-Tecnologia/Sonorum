import { NextResponse, type NextRequest } from 'next/server'

import { reconcilePayment } from '@/lib/payments/reconcile'

// Webhook do Mercado Pago. O MP avisa via query (?type=payment&data.id=) ou body
// ({ type, data: { id } }). Não confiamos no corpo: extraímos só a id e
// RE-CONSULTAMOS o pagamento na API (fonte da verdade) dentro do reconcile.
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl
  let paymentId = searchParams.get('data.id') ?? searchParams.get('id')
  const type = searchParams.get('type') ?? searchParams.get('topic')

  if (!paymentId) {
    try {
      const body = (await request.json()) as { type?: string; data?: { id?: string } }
      if (!type && body.type && body.type !== 'payment') return NextResponse.json({ ignored: true })
      paymentId = body.data?.id ?? null
    } catch {
      // sem corpo JSON — segue com o que veio na query
    }
  }

  // Só tratamos eventos de pagamento.
  if (type && type !== 'payment') return NextResponse.json({ ignored: true })
  if (!paymentId) return NextResponse.json({ ignored: true })

  try {
    await reconcilePayment(paymentId)
  } catch {
    // 200 mesmo em erro interno evita retentativa infinita do MP por bug nosso;
    // o reconcile é idempotente e pode ser reprocessado manualmente.
    return NextResponse.json({ received: true })
  }
  return NextResponse.json({ received: true })
}

// MP às vezes valida a URL com GET.
export async function GET() {
  return NextResponse.json({ ok: true })
}
