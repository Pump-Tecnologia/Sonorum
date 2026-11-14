import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
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

  return (
    <>
      <PageHeader title="Minhas mensalidades" subtitle="Seu histórico de cobranças" action={<FinanceToggle />} />

      <div className="mb-6 max-w-xs">
        <StatCard label="Em aberto" value={<MoneyValue value={emAberto} />} hint="Pendentes + atrasadas" />
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Plano / Descrição</Th>
            <Th>Vencimento</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
            <Th className="text-right">Ação</Th>
          </Tr>
        </Thead>
        <tbody>
          {charges.length === 0 && <EmptyRow colSpan={5}>Nenhuma cobrança registrada.</EmptyRow>}
          {charges.map((c) => {
            const eff = effectiveChargeStatus(c.status, c.due_date, today)
            const meta = chargeStatusMeta(eff)
            const isPayable = c.status !== 'paid' && c.status !== 'cancelled'
            const title = c.enrollment?.plan?.name ?? c.description ?? 'Cobrança'

            return (
              <Tr key={c.id}>
                <Td className="font-medium">{title}</Td>
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
                <Td className="text-right">
                  {isPayable ? (
                    <LinkButton href={`/pagar/${c.id}`} size="sm" variant="secondary">
                      Pagar PIX →
                    </LinkButton>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
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
