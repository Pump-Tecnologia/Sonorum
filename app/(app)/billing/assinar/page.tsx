import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { SubscriptionCard } from '@/components/billing/SubscriptionCard'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/session'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Assinar' }

export default async function SubscribePage() {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) redirect('/admin')

  const supabase = await createClient()
  const { data: school } = await supabase
    .from('schools')
    .select('plan_type, monthly_price')
    .eq('id', me.schoolId)
    .maybeSingle()

  const amount = Number(school?.monthly_price ?? 0)
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ''

  return (
    <>
      <PageHeader title="Assinar no cartão" subtitle="Cobrança automática mensal, sem precisar renovar" />
      <Card className="max-w-lg">
        {amount <= 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhum valor de assinatura configurado para sua escola. Fale com o suporte.
          </p>
        ) : !publicKey ? (
          <p className="text-sm text-ink-muted">
            Pagamento online ainda não configurado. (Falta a chave pública do gateway.)
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-muted">
              Plano <strong className="text-ink">{school?.plan_type}</strong> ·{' '}
              <strong className="text-ink">{formatBRL(amount)}</strong>/mês, no cartão.
            </p>
            <SubscriptionCard publicKey={publicKey} amount={amount} payerEmail={me.email ?? ''} />
          </>
        )}
        <Link href="/upgrade" className="mt-4 inline-block text-sm text-ink-muted hover:text-ink">
          ← Voltar
        </Link>
      </Card>
    </>
  )
}
