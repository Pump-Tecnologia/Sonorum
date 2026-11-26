import { redirect } from 'next/navigation'

import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import styles from '@/components/financial/financial.module.css'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { getCurrentUser } from '@/lib/auth/session'
import { chargeStatusMeta, effectiveChargeStatus, paidVia } from '@/lib/finance'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Minhas mensalidades' }

export default async function StudentChargesPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const supabase = await createClient()

  // Busca matrículas do aluno para casar com charges de planos
  const { data: userEnrolls } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', me.id)
  const enrollIds = (userEnrolls ?? []).map((e) => e.id)

  let query = supabase
    .from('charges')
    .select('id, amount, early_pay_amount, paid_amount, due_date, status, paid_at, payment_method, description, student_id, enrollment:enrollments(student_id, plan:plans(name))')

  if (enrollIds.length > 0) {
    query = query.or(`student_id.eq.${me.id},enrollment_id.in.(${enrollIds.join(',')})`)
  } else {
    query = query.eq('student_id', me.id)
  }

  const { data } = await query.order('due_date', { ascending: false })

  type ChargeRow = {
    id: string; amount: number; early_pay_amount: number | null; paid_amount: number | null
    due_date: string; status: string; paid_at: string | null
    payment_method: string | null; description: string | null; student_id: string | null
    enrollment: { plan: { name: string } | null } | null
  }
  const charges = (data ?? []) as unknown as ChargeRow[]

  const today = new Date()
  let emAberto = 0
  for (const c of charges) {
    const eff = effectiveChargeStatus(c.status, c.due_date, today)
    if (eff === 'pending' || eff === 'overdue') emAberto += Number(c.amount)
  }

  const dayMonthYear = (ymd: string) => new Date(ymd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')

  return (
    <section className={styles.page} aria-labelledby="charges-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Mensalidades</p>
          <h1 id="charges-title" className={styles.title}>Seus pagamentos</h1>
        </div>
        <div className={styles.headerActions}>
          <FinanceToggle className={styles.eyeButton} />
        </div>
      </header>

      <div className={styles.openBox}>
        <p className={styles.openLabel}>Em aberto agora</p>
        <p className={styles.openValue}><MoneyValue value={emAberto} /></p>
      </div>

      <section className={styles.panel} aria-label="Histórico de cobranças">
        {charges.length === 0 ? (
          <p className={styles.empty}>Nenhuma cobrança por enquanto.</p>
        ) : (
          <ul className={styles.list}>
            {charges.map((c) => {
              const eff = effectiveChargeStatus(c.status, c.due_date, today)
              const meta = chargeStatusMeta(eff)
              const isPayable = c.status !== 'paid' && c.status !== 'cancelled'
              const title = c.enrollment?.plan?.name ?? c.description ?? 'Cobrança'
              const value = c.status === 'paid' && c.paid_amount != null ? Number(c.paid_amount) : Number(c.amount)

              return (
                <li key={c.id} className={styles.studentRow}>
                  <div className={styles.whoText}>
                    <span className={styles.name}>{title}</span>
                    <span className={styles.meta}>
                      {c.status === 'paid' && c.paid_at
                        ? `Pago ${paidVia(c.payment_method)}em ${new Date(c.paid_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
                        : `Vence em ${dayMonthYear(c.due_date)}`}
                    </span>
                  </div>
                  <div className={styles.money}>
                    <span className={styles.amount}><MoneyValue value={value} /></span>
                    {isPayable && c.early_pay_amount != null && (
                      <span className={styles.early}><MoneyValue value={Number(c.early_pay_amount)} /> até o vencimento</span>
                    )}
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  </div>
                  <div className={styles.actions}>
                    {isPayable && (
                      <LinkButton href={`/pagar/${c.id}`} size="sm">Pagar com Pix <IconArrowRight /></LinkButton>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}
