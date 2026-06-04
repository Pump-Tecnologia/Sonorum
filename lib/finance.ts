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

// ── Tipo de cobrança do plano ────────────────────────────────────────────────
export type BillingType = 'monthly' | 'per_class'

export const BILLING_TYPES: { value: BillingType; label: string; hint: string }[] = [
  { value: 'monthly', label: 'Mensalidade', hint: 'Valor fixo todo mês' },
  { value: 'per_class', label: 'Por aula', hint: 'Preço por aula realizada no mês' },
]

export function billingTypeLabel(t: string): string {
  return t === 'per_class' ? 'Por aula' : 'Mensalidade'
}

// Valor a receber numa cobrança considerando o desconto de pontualidade:
// se há valor com desconto e o pagamento ocorre até o vencimento → valor com
// desconto; senão, valor cheio. Comparação por string ISO (YYYY-MM-DD).
export function amountForPayment(
  amount: number,
  earlyPayAmount: number | null,
  dueDate: string,
  paidOn: string,
): number {
  if (earlyPayAmount != null && paidOn <= dueDate) return earlyPayAmount
  return amount
}
