'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSaasSubscription } from '@/lib/actions/billing'

// Tipos mínimos do SDK do Mercado Pago (carregado via <script>).
interface MpBrickSettings {
  initialization: { amount: number; payer?: { email?: string } }
  callbacks: {
    onReady?: () => void
    onSubmit: (cardFormData: { token?: string; payer?: { email?: string } }) => Promise<void>
    onError?: (error: unknown) => void
  }
}
interface MpInstance {
  bricks(): { create(type: string, containerId: string, settings: MpBrickSettings): Promise<unknown> }
}
type MpConstructor = new (publicKey: string, options?: { locale?: string }) => MpInstance

const SDK_SRC = 'https://sdk.mercadopago.com/js/v2'
const CONTAINER_ID = 'sonorum-card-brick'

function loadSdk(): Promise<MpConstructor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { MercadoPago?: MpConstructor }
    if (w.MercadoPago) return resolve(w.MercadoPago)
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`)
    const onLoad = () => (w.MercadoPago ? resolve(w.MercadoPago) : reject(new Error('SDK indisponível')))
    if (existing) {
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK')))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_SRC
    s.onload = onLoad
    s.onerror = () => reject(new Error('Falha ao carregar o SDK'))
    document.body.appendChild(s)
  })
}

export function SubscriptionCard({
  publicKey,
  amount,
  payerEmail,
}: {
  publicKey: string
  amount: number
  payerEmail: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return // Bricks deve montar só uma vez
    mounted.current = true
    let cancelled = false

    loadSdk()
      .then((MercadoPago) => {
        if (cancelled) return
        const mp = new MercadoPago(publicKey, { locale: 'pt-BR' })
        return mp.bricks().create('card', CONTAINER_ID, {
          initialization: { amount, payer: { email: payerEmail } },
          callbacks: {
            onSubmit: async (cardFormData) => {
              setError(null)
              if (!cardFormData.token) {
                setError('Não foi possível validar o cartão.')
                return
              }
              const res = await createSaasSubscription({
                cardTokenId: cardFormData.token,
                payerEmail: cardFormData.payer?.email ?? payerEmail,
              })
              if (res.ok) {
                setDone(true)
                router.push('/billing/retorno?status=sucesso')
              } else {
                setError(res.error ?? 'Não foi possível ativar a assinatura.')
              }
            },
            onError: () => setError('Erro no formulário de cartão. Confira os dados.'),
          },
        })
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.'))

    return () => {
      cancelled = true
    }
  }, [publicKey, amount, payerEmail, router])

  if (done) return <p className="text-sm font-medium text-accent-800">Assinatura ativada! Redirecionando…</p>

  return (
    <div>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <div id={CONTAINER_ID} />
    </div>
  )
}
