import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getCurrentUser } from '@/lib/auth/session'
import { chargeStatusMeta, effectiveChargeStatus } from '@/lib/finance'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Minhas mensalidades' }

export default async function StudentChargesPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const { data } = await supabase
    .from('charges')
    .select('id, amount, due_date, status, paid_at, payment_method, enrollment:enrollments!inner(student_id, plan:plans(name))')
    .eq('enrollment.student_id', me.id)
    .order('due_date', { ascending: false })

  type ChargeRow = {
    id: string; amount: number; due_date: string; status: string; paid_at: string | null
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
      <PageHeader title="Minhas mensalidades" subtitle="Seu histórico de cobranças" />

      <div className="mb-6 max-w-xs">
        <StatCard label="Em aberto" value={formatBRL(emAberto)} hint="Pendentes + atrasadas" />
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
                <Td className="font-semibold">{formatBRL(Number(c.amount))}</Td>
                <Td><Badge tone={meta.tone}>{meta.label}</Badge></Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
