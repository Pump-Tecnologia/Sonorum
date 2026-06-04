'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/Button'
import { startSaasCheckout, type CheckoutActionState } from '@/lib/actions/billing'

const initial: CheckoutActionState = { ok: false }

// Inicia o checkout e redireciona o navegador pra URL do gateway.
export function CheckoutButton({ label = 'Pagar assinatura' }: { label?: string }) {
  const [state, action, pending] = useActionState(startSaasCheckout, initial)
  const handled = useRef<CheckoutActionState | null>(null)

  useEffect(() => {
    if (state === handled.current) return
    handled.current = state
    if (state.ok && state.url) window.location.href = state.url
  }, [state])

  return (
    <form action={action}>
      <Button type="submit" disabled={pending}>
        {pending ? 'Redirecionando…' : label}
      </Button>
      {state.error && <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>}
    </form>
  )
}
