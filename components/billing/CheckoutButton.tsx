'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Button } from '@/components/ui/Button'
import type { CheckoutActionState } from '@/lib/actions/billing'

const initial: CheckoutActionState = { ok: false }

type CheckoutAction = (prev: CheckoutActionState, formData: FormData) => Promise<CheckoutActionState>

// Dispara uma action de checkout e redireciona pra URL do gateway.
export function CheckoutButton({
  action,
  planType,
  label = 'Pagar',
  variant = 'primary',
}: {
  action: CheckoutAction
  planType: string
  label?: string
  variant?: 'primary' | 'outline'
}) {
  const [state, run, pending] = useActionState(action, initial)
  const handled = useRef<CheckoutActionState | null>(null)

  useEffect(() => {
    if (state === handled.current) return
    handled.current = state
    if (state.ok && state.url) window.location.href = state.url
  }, [state])

  return (
    <form action={run}>
      <input type="hidden" name="planType" value={planType} />
      <Button type="submit" disabled={pending} variant={variant === 'outline' ? 'ghost' : undefined}>
        {pending ? 'Redirecionando…' : label}
      </Button>
      {state.error && <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>}
    </form>
  )
}
