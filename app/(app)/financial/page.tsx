import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ChargeCreator, type StudentPlanOption } from '@/components/financial/ChargeCreator'
import { ChargeStatusForm } from '@/components/financial/ChargeStatusForm'
import { MonthPicker } from '@/components/financial/MonthPicker'
import { CopyButton } from '@/components/cobrancas/CopyButton'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { requireFeature } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { monthRange } from '@/lib/format'
import { effectiveChargeStatus } from '@/lib/finance'
import { waLink } from '@/lib/notifications/whatsapp'
import { appBaseUrl } from '@/lib/payments'
import { createClient } from '@/lib/supabase/server'
import { generateMonthlyCharges } from '@/lib/actions/charges'
import { notifyCharge } from '@/lib/actions/notifications'

export const metadata = { title: 'Financeiro' }

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireFeature('financial')
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')
  const schoolId = user.schoolId

  const { month: monthParam } = await searchParams
  const today = new Date()
  const month = monthParam ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const range = monthRange(new Date(`${month}-01`))
  const base = appBaseUrl()

  const supabase = await createClient()

  const [{ data: school }, { data: studentRows }, { data: enrollRows }, { data: chargeRows }] = await Promise.all([
    supabase.from('schools').select('pix_key').eq('id', schoolId).maybeSingle(),
    supabase.from('users').select('id, name, phone').eq('school_id', schoolId).eq('role', 'student').order('name'),
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
  ])

  const hasPix = Boolean(school?.pix_key)

  // Mapas auxiliares: nome/telefone do aluno + plano ativo (p/ o criador).
  const students = (studentRows ?? []) as { id: string; name: string; phone: string | null }[]
  const studentName = new Map(students.map((s) => [s.id, s.name]))
  const studentPhone = new Map(students.map((s) => [s.id, s.phone]))

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

  const dueDefault = `${month}-${String(Math.min(10, new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate())).padStart(2, '0')}`

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle={new Date(`${month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        action={
          <div className="flex items-center gap-3">
            <FinanceToggle />
            <MonthPicker month={month} />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pago" value={<MoneyValue value={paid} />} />
        <StatCard label="Pendente" value={<MoneyValue value={pending} />} />
        <StatCard label="Atrasado" value={<MoneyValue value={overdue} />} />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Nova cobrança</h2>
          <form action={generateMonthlyCharges}>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="text-sm text-ink-muted hover:text-brand-600">
              Gerar do mês inteiro (todos os planos) →
            </button>
          </form>
        </div>
        {!hasPix && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Configure sua chave PIX em{' '}
            <Link href="/admin/settings" className="font-semibold underline">Configurações</Link>{' '}
            para gerar o link de pagamento das cobranças.
          </p>
        )}
        <ChargeCreator students={studentOptions} defaultDue={dueDefault} />
      </Card>

      <Table>
        <Thead>
          <Tr>
            <Th>Aluno</Th>
            <Th>Plano / descrição</Th>
            <Th>Vencimento</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
            <Th className="text-right">Cobrar</Th>
          </Tr>
        </Thead>
        <tbody>
          {charges.length === 0 && <EmptyRow colSpan={6}>Nenhuma cobrança neste mês.</EmptyRow>}
          {charges.map((c) => {
            const sid = c.student_id ?? c.enrollment?.student_id ?? null
            const name = c.enrollment?.student?.name ?? (sid ? studentName.get(sid) : null) ?? '—'
            const planOrDesc = c.enrollment?.plan?.name ?? c.description ?? '—'
            const eff = effectiveChargeStatus(c.status, c.due_date, today)
            const payUrl = `${base}/pagar/${c.id}`
            const dueLabel = new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
            const phone = sid ? studentPhone.get(sid) : null
            const waMsg = `Olá ${name}! Cobrança de ${planOrDesc}, vence em ${dueLabel}. Pague pelo PIX: ${payUrl}`
            const waUrl = waLink(phone, waMsg)
            const payable = c.status !== 'paid' && c.status !== 'cancelled'
            return (
              <Tr key={c.id}>
                <Td className="font-medium">{name}</Td>
                <Td className="text-ink-muted">{planOrDesc}</Td>
                <Td className="text-ink-muted">{dueLabel}</Td>
                <Td className="font-semibold">
                  {c.status === 'paid' && c.paid_amount != null ? (
                    <MoneyValue value={Number(c.paid_amount)} />
                  ) : (
                    <>
                      <MoneyValue value={Number(c.amount)} />
                      {c.early_pay_amount != null && (
                        <span className="ml-1 block text-xs font-normal text-accent-700">
                          <MoneyValue value={Number(c.early_pay_amount)} /> até o venc.
                        </span>
                      )}
                    </>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ChargeStatusForm chargeId={c.id} currentStatus={c.status} />
                    {eff === 'overdue' && c.status === 'pending' && (
                      <span className="text-xs font-semibold text-red-600">⚠ vencida</span>
                    )}
                  </div>
                </Td>
                <Td className="text-right">
                  {payable && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {hasPix && waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          title={`Enviar cobrança a ${name} no WhatsApp`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3ZM12 3a9 9 0 0 0-7.6 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.6.7.7-2.6-.2-.3a7.3 7.3 0 1 1 6.1 3.4Z" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                      <WhatsAppNotifyButton
                        action={notifyCharge}
                        hidden={{ chargeId: c.id, kind: eff === 'overdue' ? 'charge.overdue' : 'charge.due_soon' }}
                        label="Lembrar"
                      />
                      {hasPix && (
                        <CopyButton
                          value={payUrl}
                          label="Copiar PIX"
                          className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300"
                        />
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
