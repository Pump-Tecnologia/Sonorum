import { PageHeader } from '@/components/app/PageHeader'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { Card } from '@/components/ui/Card'
import type { StatusTone } from '@/lib/constants/lessons'
import { reconcilePayment, reconcileSubscription } from '@/lib/payments/reconcile'

export const metadata = { title: 'Pagamento' }

const MESSAGES: Record<string, { title: string; body: string; pill: string; tone: StatusTone }> = {
  sucesso: { title: 'Pagamento aprovado', body: 'Sua assinatura foi renovada e a validade já foi estendida.', pill: 'Aprovado', tone: 'success' },
  pendente: { title: 'Pagamento em processamento', body: 'Assim que for confirmado, a validade é estendida sozinha.', pill: 'Processando', tone: 'warning' },
  falha: { title: 'Pagamento não concluído', body: 'Nada foi cobrado. Você pode tentar de novo.', pill: 'Não concluído', tone: 'danger' },
}

export default async function BillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mock_payment_id?: string; preapproval_id?: string }>
}) {
  const sp = await searchParams
  // Concilia ao retornar — útil em DEV (webhook não alcança localhost) e como
  // reforço ao webhook. Idempotente.
  if (sp.mock_payment_id) await reconcilePayment(sp.mock_payment_id)
  if (sp.preapproval_id) await reconcileSubscription(sp.preapproval_id)
  const status = sp.status ?? (sp.mock_payment_id || sp.preapproval_id ? 'sucesso' : 'pendente')
  const m = MESSAGES[status] ?? MESSAGES.pendente!

  return (
    <>
      <PageHeader title="Assinatura" />
      <Card className="max-w-lg">
        <StatusPill tone={m.tone}>{m.pill}</StatusPill>
        <h2 className="mt-4 mb-0 text-2xl font-semibold tracking-tight text-(--sn-ink)">{m.title}</h2>
        <p className="mt-2 mb-0 text-[15px] text-(--sn-text-muted)">{m.body}</p>
        <LinkButton href={status === 'falha' ? '/upgrade' : '/admin'} variant="soft" className="mt-6">
          {status === 'falha' ? 'Tentar de novo' : 'Voltar ao painel'} <IconArrowRight />
        </LinkButton>
      </Card>
    </>
  )
}
