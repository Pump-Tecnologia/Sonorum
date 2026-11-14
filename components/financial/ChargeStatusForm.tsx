'use client'

import { useState } from 'react'

import styles from '@/components/financial/financial.module.css'
import { updateChargeStatus } from '@/lib/actions/charges'
import { PAYMENT_METHODS } from '@/lib/finance'

interface Props {
  chargeId: string
  /** Status efetivo (uma pendente vencida já chega como "overdue"). */
  currentStatus: string
}

const STATUS_OPTS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const TONE: Record<string, string> = {
  pending: styles['status-pending'],
  paid: styles['status-paid'],
  overdue: styles['status-overdue'],
  cancelled: styles['status-cancelled'],
}

// Pílula de status que também troca o status: "Pago" pede o método antes de
// enviar; os demais enviam na hora.
export function ChargeStatusForm({ chargeId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const showMethod = status === 'paid' && currentStatus !== 'paid'

  return (
    <form action={updateChargeStatus} className={styles.statusPick}>
      <input type="hidden" name="chargeId" value={chargeId} />
      <select
        name="status"
        value={status}
        aria-label="Status da cobrança"
        onChange={(e) => {
          const next = e.target.value
          setStatus(next)
          if (next !== 'paid') e.currentTarget.form?.requestSubmit()
        }}
        className={`${styles.statusSelect} ${TONE[status] ?? ''}`}
      >
        {STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {showMethod && (
        <>
          <select name="paymentMethod" defaultValue={PAYMENT_METHODS[0]} aria-label="Forma de pagamento" className={styles.methodSelect}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button type="submit" className={styles.confirm}>Confirmar</button>
        </>
      )}
    </form>
  )
}
