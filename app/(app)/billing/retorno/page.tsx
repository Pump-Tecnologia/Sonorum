import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Card } from '@/components/ui/Card'
import { reconcilePayment } from '@/lib/payments/reconcile'

export const metadata = { title: 'Pagamento' }

const MESSAGES: Record<string, { title: string; body: string; tone: string }> = {
  sucesso: { title: 'Pagamento aprovado 🎉', body: 'Sua assinatura foi renovada. A validade já foi estendida.', tone: 'text-accent-800' },
  pendente: { title: 'Pagamento em processamento', body: 'Assim que for confirmado, a validade é estendida automaticamente.', tone: 'text-amber-700' },
  falha: { title: 'Pagamento não concluído', body: 'Nada foi cobrado. Você pode tentar novamente.', tone: 'text-red-700' },
}

export default async function BillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mock_payment_id?: string }>
}) {
  const sp = await searchParams
  // Fluxo de DEV (provider mock): não há webhook, então conciliamos aqui.
  if (sp.mock_payment_id) {
    await reconcilePayment(sp.mock_payment_id)
  }
  const status = sp.status ?? (sp.mock_payment_id ? 'sucesso' : 'pendente')
  const m = MESSAGES[status] ?? MESSAGES.pendente!

  return (
    <>
      <PageHeader title="Assinatura" />
      <Card className="max-w-lg">
        <h2 className={`text-lg font-semibold ${m.tone}`}>{m.title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{m.body}</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Voltar ao painel →
        </Link>
      </Card>
    </>
  )
}
