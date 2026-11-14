import { CopyButton } from '@/components/cobrancas/CopyButton'
import styles from '@/components/financial/financial.module.css'
import { amountForPayment } from '@/lib/finance'
import { formatBRL } from '@/lib/format'
import { buildPixPayload } from '@/lib/payments/pix'
import { pixQrSvg } from '@/lib/payments/pix-qr'
import { createAdminClient } from '@/lib/supabase/server'
import { dateInBR } from '@/lib/timezone'

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
    .select('id, amount, early_pay_amount, paid_amount, due_date, status, description, school_id, student_id, enrollment:enrollments(student_id, plan:plans(name))')
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

  const enr = charge.enrollment as { student_id: string; plan: { name: string } | null } | null
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
          done
          title="Pagamento confirmado"
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

  const today = dateInBR()
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
      <p className={styles.payWhat}>{charge.description || enr?.plan?.name || 'Mensalidade'}{studentName ? ` · ${studentName}` : ''}</p>
      <p className={styles.payAmount}>{formatBRL(amount)}</p>
      <span className={styles.payDue}>Vence em {dueLabel}</span>

      <div className={styles.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} role="img" aria-label="QR Code Pix" />

      <p className={styles.copyLabel}>Ou use o Pix copia e cola</p>
      <div className={styles.copyRow}>
        <p className={styles.copyCode}>{payload}</p>
        <CopyButton value={payload} label="Copiar" className={styles.copyButton} />
      </div>

      <ol className={styles.steps}>
        <li>Abra o app do seu banco e entre em Pix.</li>
        <li>Leia o QR Code ou cole o código copiado.</li>
        <li>Confira o valor e confirme.</li>
      </ol>

      <p className={styles.payFoot}>O pagamento vai direto para {schoolName}.</p>
    </PagarShell>
  )
}

function PagarShell({ children, schoolName }: { children: React.ReactNode; schoolName?: string }) {
  return (
    <main className={styles.payStage}>
      <div className={styles.payCard}>
        {schoolName && <p className={styles.paySchool}>{schoolName}</p>}
        {children}
      </div>
    </main>
  )
}

function Message({ title, body, done = false }: { title: string; body: string; done?: boolean }) {
  return (
    <div>
      <span className={styles.payIcon} aria-hidden="true">
        {done ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5M12 15.8v.2" /></svg>
        )}
      </span>
      <h1 className={styles.payMessageTitle}>{title}</h1>
      <p className={styles.payMessageBody}>{body}</p>
    </div>
  )
}
