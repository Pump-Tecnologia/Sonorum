import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ChargeStatusForm } from '@/components/financial/ChargeStatusForm'
import { CopyButton } from '@/components/cobrancas/CopyButton'
import { NewChargeForm } from '@/components/cobrancas/NewChargeForm'
import { Card } from '@/components/ui/Card'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getCurrentUser } from '@/lib/auth/session'
import { chargeStatusMeta, effectiveChargeStatus } from '@/lib/finance'
import { formatBRL } from '@/lib/format'
import { appBaseUrl } from '@/lib/payments'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Cobranças' }

export default async function CobrancasPage() {
  const user = await getCurrentUser()
  if (user?.role !== 'admin' || !user.schoolId) redirect('/admin')

  const supabase = await createClient()

  const [{ data: school }, { data: students }, { data: chargeRows }] = await Promise.all([
    supabase.from('schools').select('pix_key, pix_city').eq('id', user.schoolId).single(),
    supabase
      .from('users')
      .select('id, name')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .order('name'),
    supabase
      .from('charges')
      .select('id, amount, due_date, status, description, paid_amount, student_id')
      .eq('school_id', user.schoolId)
      .not('student_id', 'is', null)
      .is('enrollment_id', null)
      .order('due_date', { ascending: false })
      .limit(100),
  ])

  const hasPix = Boolean(school?.pix_key)
  const today = new Date()
  const base = appBaseUrl()

  type Row = {
    id: string
    amount: number
    due_date: string
    status: string
    description: string | null
    paid_amount: number | null
    student_id: string | null
  }
  const charges = (chargeRows ?? []) as unknown as Row[]
  const studentOptions = (students ?? []) as { id: string; name: string }[]
  const studentName = new Map(studentOptions.map((s) => [s.id, s.name]))

  return (
    <>
      <PageHeader
        title="Cobranças"
        subtitle="Cobre seus alunos no PIX — o pagamento cai direto na sua conta"
      />

      {!hasPix && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Configure sua chave PIX primeiro</p>
          <p className="mt-1 text-sm text-amber-800">
            Para gerar o link de pagamento, cadastre sua chave PIX em{' '}
            <Link href="/admin/settings" className="font-semibold underline">Configurações</Link>.
          </p>
        </div>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Nova cobrança</h2>
        <NewChargeForm students={studentOptions} />
      </Card>

      <Table>
        <Thead>
          <Tr>
            <Th>Aluno</Th>
            <Th>Descrição</Th>
            <Th>Vencimento</Th>
            <Th>Valor</Th>
            <Th>Status</Th>
            <Th className="text-right">Pagamento</Th>
          </Tr>
        </Thead>
        <tbody>
          {charges.length === 0 && <EmptyRow colSpan={6}>Nenhuma cobrança avulsa ainda.</EmptyRow>}
          {charges.map((c) => {
            const eff = effectiveChargeStatus(c.status, c.due_date, today)
            const meta = chargeStatusMeta(eff)
            const payUrl = `${base}/pagar/${c.id}`
            return (
              <Tr key={c.id}>
                <Td className="font-medium">{(c.student_id && studentName.get(c.student_id)) || '—'}</Td>
                <Td className="text-ink-muted">{c.description ?? '—'}</Td>
                <Td className="text-ink-muted">
                  {new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </Td>
                <Td className="font-semibold">
                  {c.status === 'paid' && c.paid_amount != null
                    ? formatBRL(Number(c.paid_amount))
                    : formatBRL(Number(c.amount))}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <ChargeStatusForm chargeId={c.id} currentStatus={c.status} />
                    <span className={`text-xs font-semibold ${meta.tone === 'danger' ? 'text-red-600' : 'text-ink-muted'}`}>
                      {meta.label}
                    </span>
                  </div>
                </Td>
                <Td className="text-right">
                  {c.status !== 'paid' && c.status !== 'cancelled' && hasPix && (
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/pagar/${c.id}`}
                        target="_blank"
                        className="text-sm font-semibold text-brand-600 hover:underline"
                      >
                        Ver PIX ↗
                      </Link>
                      <CopyButton
                        value={payUrl}
                        label="Copiar link"
                        className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300"
                      />
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
