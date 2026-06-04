import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getCurrentUser } from '@/lib/auth/session'
import { chargeStatusMeta, effectiveChargeStatus } from '@/lib/finance'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Minhas mensalidades' }

export default async function StudentChargesPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const { data } = await supabase
    .from('charges')
    .select('id, amount, early_pay_amount, paid_amount, due_date, status, paid_at, payment_method, enrollment:enrollments!inner(student_id, plan:plans(name))')
    .eq('enrollment.student_id', me.id)
    .order('due_date', { ascending: false })

  type ChargeRow = {
    id: string; amount: number; early_pay_amount: number | null; paid_amount: number | null
    due_date: string; status: string; paid_at: string | null
    payment_method: string | null
    enrollment: { plan: { name: string } | null } | null
  }
  const charges = (data ?? []) as unknown as ChargeRow[]

  const today = new Date()
  let emAberto = 0
  for (const c of charges) {
    const eff = effectiveChargeStatus(c.status, c.due_date, today)
    if (eff === 'pending' || eff === 'overdue') emAberto += Number(c.amount)
  }

  return (
    <>
      <PageHeader title="Minhas mensalidades" subtitle="Seu histórico de cobranças" action={<FinanceToggle />} />

      <div className="mb-6 max-w-xs">
        <StatCard label="Em aberto" value={<MoneyValue value={emAberto} />} hint="Pendentes + atrasadas" />
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Plano</Th>
            <Th>Vencimento</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <tbody>
          {charges.length === 0 && <EmptyRow colSpan={4}>Nenhuma cobrança registrada.</EmptyRow>}
          {charges.map((c) => {
            const meta = chargeStatusMeta(effectiveChargeStatus(c.status, c.due_date, today))
            return (
              <Tr key={c.id}>
                <Td className="font-medium">{c.enrollment?.plan?.name ?? '—'}</Td>
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
                        <span className="block text-xs font-normal text-accent-700">
                          <MoneyValue value={Number(c.early_pay_amount)} /> até o venc.
                        </span>
                      )}
                    </>
                  )}
                </Td>
                <Td><Badge tone={meta.tone}>{meta.label}</Badge></Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
