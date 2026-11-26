import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CopyButton } from '@/components/cobrancas/CopyButton'
import { LockedFeatureCard } from '@/components/billing/LockedFeatureCard'
import { Avatar } from '@/components/ds/Avatar'
import { ExternalLink } from '@/components/ds/ExternalLink'
import { IconChevronLeft, IconChevronRight } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import { MoreMenu } from '@/components/ds/MoreMenu'
import { PlainSubmit } from '@/components/ds/PlainSubmit'
import dsStyles from '@/components/ds/ds.module.css'
import { ChargeCreator, type StudentPlanOption } from '@/components/financial/ChargeCreator'
import { ChargeStatusForm } from '@/components/financial/ChargeStatusForm'
import styles from '@/components/financial/financial.module.css'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { generateMonthlyCharges } from '@/lib/actions/charges'
import { notifyCharge } from '@/lib/actions/notifications'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import { effectiveChargeStatus } from '@/lib/finance'
import { monthRange } from '@/lib/format'
import { waLink } from '@/lib/notifications/whatsapp'
import { appBaseUrl } from '@/lib/payments'
import { createClient } from '@/lib/supabase/server'
import { dateInBR } from '@/lib/timezone'

export const metadata = { title: 'Financeiro' }

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

// Mês vizinho no formato YYYY-MM (delta = -1 anterior, +1 próximo).
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 15))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const dayMonth = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const [user, plan] = await Promise.all([getCurrentUser(), getPlanContext()])
  if (!user?.schoolId) redirect('/admin')
  const schoolId = user.schoolId

  if (!plan.features.financial) {
    return (
      <>
        <PageHeader
          title="Financeiro"
          info="Controle de mensalidades, cobranças e inadimplência"
        />
        <LockedFeatureCard
          title="Módulo Financeiro e Cobranças"
          subtitle="Automatize a gestão de mensalidades da sua escola"
          description="Controle com facilidade quem pagou, quem está pendente e quem está inadimplente. Emita cobranças via Pix e Boletos com baixa automática, envie lembretes por WhatsApp e tenha total visibilidade da saúde financeira do seu negócio."
          benefits={[
            'Emissão de Pix (QR Code e Copia e Cola) e boletos automatizados via Asaas',
            'Baixa automática do pagamento no sistema assim que o aluno pagar',
            'Disparo de lembretes e mensagens de cobrança para WhatsApp e E-mail',
            'Visão em tempo real de faturamento pago, pendente e inadimplência total',
            'Descontos automáticos de pontualidade e regras personalizadas por aluno',
          ]}
          planRequirement="Disponível a partir do plano Solo (R$ 49,90/mês) ou Profissional (R$ 99/mês)."
          isExpired={plan.isExpired}
          inGracePeriod={plan.inGracePeriod}
          graceDaysRemaining={plan.graceDaysRemaining}
        />
      </>
    )
  }

  const { month: monthParam } = await searchParams
  const today = new Date()
  const currentMonth = dateInBR(today).slice(0, 7)
  const month = MONTH_RE.test(monthParam ?? '') ? monthParam! : currentMonth
  // Meio-dia UTC evita que o date-only seja interpretado como mês anterior em BRT.
  const range = monthRange(new Date(`${month}-15T12:00:00Z`))
  const base = appBaseUrl()
  const monthTitle = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'long', year: 'numeric' })

  const supabase = await createClient()

  const [{ data: school }, { data: studentRows }, { data: enrollRows }, { data: chargeRows }, { data: openRows }] = await Promise.all([
    supabase.from('schools').select('pix_key').eq('id', schoolId).maybeSingle(),
    supabase.from('users').select('id, name, phone, instrument').eq('school_id', schoolId).eq('role', 'student').order('name'),
    supabase
      .from('enrollments')
      .select('student_id, custom_amount, plan:plans(name, amount, billing_type)')
      .eq('school_id', schoolId)
      .eq('status', 'active'),
    supabase
      .from('charges')
      .select('id, amount, early_pay_amount, paid_amount, due_date, status, description, student_id, enrollment:enrollments(student_id, student:users(name), plan:plans(name))')
      .gte('due_date', range.start)
      .lte('due_date', range.end)
      .order('due_date'),
    // Inadimplência GLOBAL: tudo em aberto (não pago), sem filtro de período.
    supabase
      .from('charges')
      .select('amount, due_date, status, student_id, enrollment:enrollments(student_id)')
      .eq('school_id', schoolId)
      .in('status', ['pending', 'overdue']),
  ])

  const hasPix = Boolean(school?.pix_key)

  // Mapas auxiliares: nome/telefone/instrumento do aluno + plano ativo (p/ o criador).
  const students = (studentRows ?? []) as { id: string; name: string; phone: string | null; instrument: unknown }[]
  const studentName = new Map(students.map((s) => [s.id, s.name]))
  const studentPhone = new Map(students.map((s) => [s.id, s.phone]))
  const studentTone = new Map(students.map((s) => [s.id, instrumentTone(s.instrument)]))

  type EnrollRow = { student_id: string; custom_amount: number | null; plan: { name: string; amount: number; billing_type: string } | null }
  const planByStudent = new Map<string, { name: string; billingType: string; unit: number }>()
  for (const e of (enrollRows ?? []) as unknown as EnrollRow[]) {
    if (!e.plan) continue
    const unit = e.custom_amount != null ? Number(e.custom_amount) : Number(e.plan.amount)
    planByStudent.set(e.student_id, { name: e.plan.name, billingType: e.plan.billing_type, unit })
  }
  const studentOptions: StudentPlanOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    plan: planByStudent.get(s.id) ?? null,
  }))

  type ChargeRow = {
    id: string; amount: number; early_pay_amount: number | null; paid_amount: number | null
    due_date: string; status: string; description: string | null; student_id: string | null
    enrollment: { student_id: string | null; student: { name: string } | null; plan: { name: string } | null } | null
  }
  const charges = (chargeRows ?? []) as unknown as ChargeRow[]

  let paid = 0, pending = 0, overdue = 0
  for (const c of charges) {
    const amt = Number(c.amount)
    const eff = effectiveChargeStatus(c.status, c.due_date, today)
    if (eff === 'paid') paid += c.paid_amount != null ? Number(c.paid_amount) : amt
    else if (eff === 'overdue') overdue += amt
    else if (eff === 'pending') pending += amt
  }

  // Inadimplência global: agrupa cobranças vencidas (todos os meses) por aluno.
  type OpenRow = { amount: number; due_date: string; status: string; student_id: string | null; enrollment: { student_id: string | null } | null }
  type Debtor = { id: string; name: string; total: number; count: number; oldest: string }
  const debtorsMap = new Map<string, Debtor>()
  let overdueTotal = 0
  for (const c of (openRows ?? []) as unknown as OpenRow[]) {
    if (effectiveChargeStatus(c.status, c.due_date, today) !== 'overdue') continue
    const sid = c.student_id ?? c.enrollment?.student_id ?? null
    if (!sid) continue
    overdueTotal += Number(c.amount)
    const d = debtorsMap.get(sid) ?? { id: sid, name: studentName.get(sid) ?? '—', total: 0, count: 0, oldest: c.due_date }
    d.total += Number(c.amount)
    d.count++
    if (c.due_date < d.oldest) d.oldest = c.due_date
    debtorsMap.set(sid, d)
  }
  const debtors = [...debtorsMap.values()].sort((a, b) => b.total - a.total)

  const dueDefault = `${month}-${String(Math.min(10, new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate())).padStart(2, '0')}`

  return (
    <section className={styles.page} aria-labelledby="financial-title">
      <header className={styles.header}>
        <div>
          <h1 id="financial-title" className={styles.kicker}>Financeiro</h1>
          <p className={styles.title} aria-live="polite">{monthTitle}</p>
        </div>
        <nav className={styles.headerActions} aria-label="Mês">
          <Link href={`/financial?month=${shiftMonth(month, -1)}`} className={styles.stepButton} aria-label="Mês anterior" title="Mês anterior"><IconChevronLeft /></Link>
          <Link href={`/financial?month=${shiftMonth(month, 1)}`} className={styles.stepButton} aria-label="Próximo mês" title="Próximo mês"><IconChevronRight /></Link>
          <Link href="/financial" className={styles.todayLink} aria-disabled={month === currentMonth || undefined}>Mês atual</Link>
          <FinanceToggle className={styles.eyeButton} />
        </nav>
      </header>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.statPaid}`}>
          <p className={styles.statLabel}>Recebido</p>
          <p className={styles.statValue}><MoneyValue value={paid} /></p>
        </div>
        <div className={`${styles.stat} ${styles.statPending}`}>
          <p className={styles.statLabel}>A receber</p>
          <p className={styles.statValue}><MoneyValue value={pending} /></p>
        </div>
        <div className={`${styles.stat} ${styles.statOverdue}`}>
          <p className={styles.statLabel}>Em atraso</p>
          <p className={styles.statValue}><MoneyValue value={overdue} /></p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Cobranças do mês */}
        <section className={styles.panel} aria-labelledby="charges-title">
          <div className={styles.panelHead}>
            <div className={styles.titleRow}>
              <h2 id="charges-title" className={styles.panelTitle}>Cobranças do mês</h2>
              <InfoButton label="Sobre as cobranças do mês">Lembrar envia o lembrete da cobrança ao aluno por e-mail e WhatsApp.</InfoButton>
            </div>
            {charges.length > 0 && <p className={styles.panelHint}>{charges.length} {charges.length === 1 ? 'cobrança' : 'cobranças'}</p>}
          </div>

          {charges.length === 0 ? (
            <p className={styles.empty}>Nenhuma cobrança neste mês.</p>
          ) : (
            <ul className={styles.list}>
              {charges.map((c) => {
                const sid = c.student_id ?? c.enrollment?.student_id ?? null
                const name = c.enrollment?.student?.name ?? (sid ? studentName.get(sid) : null) ?? '—'
                const planOrDesc = c.enrollment?.plan?.name ?? c.description ?? 'Cobrança'
                const eff = effectiveChargeStatus(c.status, c.due_date, today)
                const payUrl = `${base}/pagar/${c.id}`
                const dueLabel = new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
                const phone = sid ? studentPhone.get(sid) : null
                const waMsg = `Olá ${name}! Cobrança de ${planOrDesc}, vence em ${dueLabel}. Pague pelo PIX: ${payUrl}`
                const waUrl = waLink(phone, waMsg)
                const payable = c.status !== 'paid' && c.status !== 'cancelled'
                const showMenu = payable && hasPix
                return (
                  <li key={c.id} className={styles.charge}>
                    <div className={styles.who}>
                      <Avatar name={name} tone={sid ? studentTone.get(sid) : undefined} />
                      <div className={styles.whoText}>
                        <span className={styles.name}>
                          {sid ? <Link href={`/admin/students/${sid}`} className={styles.nameLink}>{name}</Link> : name}
                        </span>
                        <span className={styles.meta}>{planOrDesc}</span>
                        <span className={styles.meta}>Vence em {dayMonth(c.due_date)}</span>
                      </div>
                    </div>
                    <div className={styles.money}>
                      <span className={styles.amount}>
                        <MoneyValue value={c.status === 'paid' && c.paid_amount != null ? Number(c.paid_amount) : Number(c.amount)} />
                      </span>
                      {c.status !== 'paid' && c.early_pay_amount != null && (
                        <span className={styles.early}><MoneyValue value={Number(c.early_pay_amount)} /> até o vencimento</span>
                      )}
                      <ChargeStatusForm chargeId={c.id} currentStatus={eff === 'overdue' && c.status === 'pending' ? 'overdue' : c.status} />
                    </div>
                    <div className={styles.actions}>
                      {payable && (
                        <WhatsAppNotifyButton
                          action={notifyCharge}
                          hidden={{ chargeId: c.id, kind: eff === 'overdue' ? 'charge.overdue' : 'charge.due_soon' }}
                          label="Lembrar"
                          className={styles.remind}
                        />
                      )}
                      {showMenu && (
                        <MoreMenu label={`Mais ações para a cobrança de ${name}`}>
                          {waUrl && (
                            <ExternalLink href={waUrl} className={styles.menuLink}>Enviar no WhatsApp</ExternalLink>
                          )}
                          <CopyButton value={payUrl} label="Copiar link de pagamento" className={dsStyles.menuItem} />
                        </MoreMenu>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className={styles.side}>
          {/* Nova cobrança */}
          <section className={styles.panel} aria-labelledby="new-charge-title">
            <div className={styles.panelHead}>
              <div className={styles.titleRow}>
                <h2 id="new-charge-title" className={styles.panelTitle}>Nova cobrança</h2>
                <InfoButton label="Sobre a nova cobrança">Gerar o mês inteiro cria as cobranças deste mês para todos os alunos com plano.</InfoButton>
              </div>
              <form action={generateMonthlyCharges}>
                <input type="hidden" name="month" value={month} />
                <PlainSubmit className={styles.bulk} pendingLabel="Gerando…">Gerar o mês inteiro</PlainSubmit>
              </form>
            </div>
            {!hasPix && (
              <p className={`${styles.warn} ${styles.spaced}`}>
                Cadastre a chave Pix em <Link href="/admin/settings">Configurações</Link> para as cobranças terem link de pagamento.
              </p>
            )}
            <ChargeCreator students={studentOptions} defaultDue={dueDefault} />
          </section>

          {/* Em atraso (todos os meses) */}
          <section className={styles.panel} aria-labelledby="debtors-title">
            <div className={styles.panelHead}>
              <h2 id="debtors-title" className={styles.panelTitle}>Em atraso</h2>
              {debtors.length > 0 && <span className={styles.debtTotal}><MoneyValue value={overdueTotal} /></span>}
            </div>
            {debtors.length === 0 ? (
              <p className={styles.empty}>Ninguém em atraso.</p>
            ) : (
              <div>
                {debtors.map((d) => (
                  <div key={d.id} className={styles.debtor}>
                    <div className={styles.who}>
                      <Avatar name={d.name} tone={studentTone.get(d.id)} />
                      <div className={styles.whoText}>
                        <Link href={`/admin/students/${d.id}`} className={`${styles.name} ${styles.nameLink}`}>{d.name}</Link>
                        <span className={styles.meta}>
                          {d.count} {d.count === 1 ? 'cobrança em aberto' : 'cobranças em aberto'} desde {dayMonth(d.oldest)}
                        </span>
                      </div>
                    </div>
                    <span className={styles.debtAmount}><MoneyValue value={d.total} /></span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}
