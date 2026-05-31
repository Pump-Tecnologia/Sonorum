import type { ChargeStatus } from '@/lib/types/app'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export const CHARGE_STATUS_META: Record<ChargeStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  overdue: { label: 'Atrasado', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

// Status EFETIVO: uma cobrança pendente com vencimento já passado conta como
// atrasada, sem precisar de write/cron. Comparação por string ISO (YYYY-MM-DD).
export function effectiveChargeStatus(
  status: string,
  dueDate: string | null,
  today: Date = new Date(),
): ChargeStatus {
  if (status === 'pending' && dueDate && dueDate < today.toISOString().slice(0, 10)) {
    return 'overdue'
  }
  return status as ChargeStatus
}

export function chargeStatusMeta(status: string): { label: string; tone: StatusTone } {
  return CHARGE_STATUS_META[status as ChargeStatus] ?? { label: status, tone: 'neutral' }
}

export const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto'] as const
