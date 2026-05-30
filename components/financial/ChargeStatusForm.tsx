'use client'

import { updateChargeStatus } from '@/lib/actions/charges'

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
  return (
    <form action={updateChargeStatus} className="flex items-center gap-2">
      <input type="hidden" name="chargeId" value={chargeId} />
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => {
          const form = e.currentTarget.form
          if (form) form.requestSubmit()
        }}
        className={`rounded-lg border border-hairline bg-surface px-2 py-1 text-xs font-semibold ${TONE[currentStatus] ?? ''}`}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  )
}
