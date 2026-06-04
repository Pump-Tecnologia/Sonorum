import { PageHeader } from '@/components/app/PageHeader'
import { ChargeStatusForm } from '@/components/financial/ChargeStatusForm'
import { MonthPicker } from '@/components/financial/MonthPicker'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { requireFeature } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { monthRange } from '@/lib/format'
import { effectiveChargeStatus } from '@/lib/finance'
import { createClient } from '@/lib/supabase/server'
import { generateMonthlyCharges } from '@/lib/actions/charges'
import { notifyCharge } from '@/lib/actions/notifications'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Financeiro' }

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireFeature('financial')
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const { month: monthParam } = await searchParams
  const today = new Date()
  const month = monthParam ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const range = monthRange(new Date(`${month}-01`))

  const supabase = await createClient()

  type ChargeRow = {
    id: string; amount: number; early_pay_amount: number | null; paid_amount: number | null
    due_date: string; status: string; paid_at: string | null
    enrollment: { student: { name: string } | null; plan: { name: string } | null } | null
  }

  const { data } = await supabase
    .from('charges')
    .select('id, amount, early_pay_amount, paid_amount, due_date, status, paid_at, enrollment:enrollments(student:users(name), plan:plans(name))')
    .gte('due_date', range.start)
    .lte('due_date', range.end)
    .order('due_date')

  const charges = (data ?? []) as unknown as ChargeRow[]
  // Status efetivo: pendente vencida conta como atrasada (sem write).
  // "Pago" usa o valor realmente recebido (paid_amount); aberto usa o valor cheio.
  let paid = 0, pending = 0, overdue = 0
  for (const c of charges) {
    const amt = Number(c.amount)
    const eff = effectiveChargeStatus(c.status, c.due_date, today)
    if (eff === 'paid') paid += c.paid_amount != null ? Number(c.paid_amount) : amt
    else if (eff === 'overdue') overdue += amt
    else if (eff === 'pending') pending += amt
  }

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

      {charges.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-hairline p-8 text-center">
          <p className="text-sm text-ink-muted">Nenhuma cobrança neste mês.</p>
          <form action={generateMonthlyCharges} className="mt-3 inline-block">
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted">
              Gerar cobranças das matrículas ativas →
            </button>
          </form>
        </div>
      )}

      <Table>
        <Thead>
          <Tr>
            <Th>Aluno</Th>
            <Th>Plano</Th>
            <Th>Vencimento</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
            <Th className="text-right">Lembrete</Th>
          </Tr>
        </Thead>
        <tbody>
          {charges.length === 0 && <EmptyRow colSpan={6}>—</EmptyRow>}
          {charges.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.enrollment?.student?.name ?? '—'}</Td>
              <Td className="text-ink-muted">{c.enrollment?.plan?.name ?? '—'}</Td>
              <Td className="text-ink-muted">
                {new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Td>
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
                  {effectiveChargeStatus(c.status, c.due_date, today) === 'overdue' && c.status === 'pending' && (
                    <span className="text-xs font-semibold text-red-600">⚠ vencida</span>
                  )}
                </div>
              </Td>
              <Td className="text-right">
                {c.status === 'pending' && (
                  <WhatsAppNotifyButton
                    action={notifyCharge}
                    hidden={{
                      chargeId: c.id,
                      kind: effectiveChargeStatus(c.status, c.due_date, today) === 'overdue' ? 'charge.overdue' : 'charge.due_soon',
                    }}
                    label="Lembrar"
                  />
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      {charges.length > 0 && (
        <div className="mt-4 text-right">
          <form action={generateMonthlyCharges} className="inline-block">
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="text-sm text-ink-muted hover:text-brand-600">
              Regenerar cobranças do mês
            </button>
          </form>
        </div>
      )}
    </>
  )
}
