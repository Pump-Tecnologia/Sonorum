'use client'

import { useState } from 'react'

import { updateChargeStatus } from '@/lib/actions/charges'
import { PAYMENT_METHODS } from '@/lib/finance'

interface Props {
  chargeId: string
  currentStatus: string
}

const STATUS_OPTS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const TONE: Record<string, string> = {
  pending: 'text-amber-700',
  paid: 'text-accent-700',
  overdue: 'text-red-700',
  cancelled: 'text-ink-muted',
}

export function ChargeStatusForm({ chargeId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const showMethod = status === 'paid'

  return (
    <form action={updateChargeStatus} className="flex items-center gap-2">
      <input type="hidden" name="chargeId" value={chargeId} />
      <select
        name="status"
        value={status}
        onChange={(e) => {
          const next = e.target.value
          setStatus(next)
          // 'Pago' espera o método antes de enviar; os demais submetem na hora.
          if (next !== 'paid') e.currentTarget.form?.requestSubmit()
        }}
        className={`rounded-lg border border-hairline bg-surface px-2 py-1 text-xs font-semibold ${TONE[status] ?? ''}`}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {showMethod && (
        <>
          <select
            name="paymentMethod"
            defaultValue={PAYMENT_METHODS[0]}
            className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-accent-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent-700"
          >
            Confirmar
          </button>
        </>
      )}
    </form>
  )
}
