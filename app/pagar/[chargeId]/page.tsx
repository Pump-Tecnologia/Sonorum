import { CopyButton } from '@/components/cobrancas/CopyButton'
import { amountForPayment } from '@/lib/finance'
import { formatBRL } from '@/lib/format'
import { buildPixPayload } from '@/lib/payments/pix'
import { pixQrSvg } from '@/lib/payments/pix-qr'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Pagamento PIX' }

// Página pública (sem login): o aluno abre o link e paga via PIX da escola.
// Lê com service-role pois o pagador não está autenticado; expõe só o mínimo
// (nome do aluno, valor, escola). O id da cobrança é um UUID não adivinhável.
export default async function PagarPage({
  params,
}: {
  params: Promise<{ chargeId: string }>
}) {
  const { chargeId } = await params
  const admin = await createAdminClient()

  const { data: charge } = await admin
    .from('charges')
    .select('id, amount, early_pay_amount, paid_amount, due_date, status, description, school_id, student_id, enrollment:enrollments(student_id)')
    .eq('id', chargeId)
    .maybeSingle()

  if (!charge) return <PagarShell><Message title="Cobrança não encontrada" body="Confira o link com a escola." /></PagarShell>

  const { data: school } = await admin
    .from('schools')
    .select('name, custom_name, pix_key, pix_city')
    .eq('id', charge.school_id ?? '')
    .maybeSingle()

  const schoolName = school?.custom_name || school?.name || 'Escola'

  if (!school?.pix_key) {
    return (
      <PagarShell>
        <Message title="PIX não configurado" body={`${schoolName} ainda não cadastrou a chave PIX. Fale com a escola.`} />
      </PagarShell>
    )
  }

  const enr = charge.enrollment as { student_id: string } | null
  const studentId = charge.student_id ?? enr?.student_id ?? null
  let studentName = ''
  if (studentId) {
    const { data: student } = await admin.from('users').select('name').eq('id', studentId).maybeSingle()
    studentName = student?.name ?? ''
  }

  const isPaid = charge.status === 'paid'
  const isCancelled = charge.status === 'cancelled'

  if (isPaid) {
    return (
      <PagarShell schoolName={schoolName}>
        <Message
          title="Pagamento confirmado ✓"
          body={`Esta cobrança${studentName ? ` de ${studentName}` : ''} já consta como paga. Obrigado!`}
        />
      </PagarShell>
    )
  }

  if (isCancelled) {
    return (
      <PagarShell schoolName={schoolName}>
        <Message title="Cobrança cancelada" body="Esta cobrança não está mais ativa." />
      </PagarShell>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const amount = amountForPayment(
    Number(charge.amount),
    charge.early_pay_amount != null ? Number(charge.early_pay_amount) : null,
    charge.due_date,
    today,
  )

  const payload = buildPixPayload({
    key: school.pix_key,
    merchantName: schoolName,
    merchantCity: school.pix_city || 'BRASIL',
    amount,
    txid: charge.id,
  })
  const qrSvg = await pixQrSvg(payload)
  const dueLabel = new Date(charge.due_date + 'T12:00:00').toLocaleDateString('pt-BR')

  return (
    <PagarShell schoolName={schoolName}>
      <div className="text-center">
        <p className="text-sm text-ink-muted">{charge.description || 'Cobrança'}</p>
        {studentName && <p className="mt-1 text-sm text-ink-muted">Aluno: {studentName}</p>}
        <p className="mt-4 text-4xl font-bold text-ink">{formatBRL(amount)}</p>
        <p className="mt-1 text-sm text-ink-muted">Vencimento: {dueLabel}</p>
      </div>

      <div className="mx-auto mt-6 w-[240px]" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR Code PIX" />

      <p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
        PIX copia e cola
      </p>
      <p className="mt-2 break-all rounded-lg border border-hairline bg-surface-muted/40 p-3 text-center font-mono text-[11px] leading-relaxed text-ink">
        {payload}
      </p>

      <div className="mt-4 flex justify-center">
        <CopyButton value={payload} label="Copiar código PIX" />
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Abra o app do seu banco → PIX → Pix Copia e Cola, cole o código e confirme. O pagamento vai
        direto para {schoolName}.
      </p>
    </PagarShell>
  )
}

function PagarShell({ children, schoolName }: { children: React.ReactNode; schoolName?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-8 shadow-sm">
        {schoolName && (
          <p className="mb-6 text-center text-base font-semibold text-brand-700">{schoolName}</p>
        )}
        {children}
      </div>
    </main>
  )
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
    </div>
  )
}
