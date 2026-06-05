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
import { waLink } from '@/lib/notifications/whatsapp'
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
      .select('id, name, phone')
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
  const studentRows = (students ?? []) as { id: string; name: string; phone: string | null }[]
  const studentOptions = studentRows.map((s) => ({ id: s.id, name: s.name }))
  const studentName = new Map(studentRows.map((s) => [s.id, s.name]))
  const studentPhone = new Map(studentRows.map((s) => [s.id, s.phone]))

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
            const name = (c.student_id && studentName.get(c.student_id)) || ''
            const dueLabel = new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR')
            const phone = c.student_id ? studentPhone.get(c.student_id) : null
            const waMsg = `Olá ${name}! ${c.description ? `${c.description} — ` : ''}Cobrança de ${formatBRL(Number(c.amount))}, vence em ${dueLabel}. Pague pelo PIX: ${payUrl}`
            const waUrl = waLink(phone, waMsg)
            const payable = c.status !== 'paid' && c.status !== 'cancelled' && hasPix
            return (
              <Tr key={c.id}>
                <Td className="font-medium">{name || '—'}</Td>
                <Td className="text-ink-muted">{c.description ?? '—'}</Td>
                <Td className="text-ink-muted">{dueLabel}</Td>
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
                  {payable && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {waUrl && (
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
