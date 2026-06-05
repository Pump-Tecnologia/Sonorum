import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { startSaasSubscriptionCheckout } from '@/lib/actions/billing'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { PLAN_FEATURES, SELLABLE_PLANS, planPrice } from '@/lib/constants/plans'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Planos' }

const FEATURE_LINES: Record<string, string[]> = {
  professional: ['Alunos e professores ilimitados', 'Financeiro completo', 'Relatórios completos'],
  premium: ['Tudo do Profissional', 'Transcrição de cifra por IA', 'Marca personalizada (logo e cores)'],
}

export default async function UpgradePage() {
  const { planType, expirationDate } = await getPlanContext()
  const me = await getCurrentUser()

  let monthlyPrice = 0
  if (me?.schoolId) {
    const supabase = await createClient()
    const { data: school } = await supabase.from('schools').select('monthly_price').eq('id', me.schoolId).maybeSingle()
    monthlyPrice = Number(school?.monthly_price ?? 0)
  }

  const today = new Date().toISOString().slice(0, 10)
  const active = expirationDate != null && expirationDate >= today

  return (
    <>
      <PageHeader
        title="Escolha seu plano"
        subtitle={
          planType === 'free'
            ? 'Você está no plano Essencial (grátis)'
            : `Plano atual: ${PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES]?.label ?? planType}${expirationDate ? ` · ${active ? 'válido até' : 'venceu em'} ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}`
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {SELLABLE_PLANS.map((plan) => {
          const f = PLAN_FEATURES[plan]
          const price = planPrice(plan, monthlyPrice)
          const isCurrent = planType === plan && active
          return (
            <Card key={plan} className={isCurrent ? 'border-brand-300 bg-brand-50/40' : ''}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">{f.label}</h2>
                {isCurrent && <Badge tone="success">Plano atual</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold text-brand-700">
                {formatBRL(price)}<span className="text-sm font-normal text-ink-muted">/mês</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                {FEATURE_LINES[plan]?.map((line) => <li key={line}>✓ {line}</li>)}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <CheckoutButton
                  action={startSaasSubscriptionCheckout}
                  planType={plan}
                  label={isCurrent ? 'Renovar assinatura' : 'Assinar agora'}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Assinando no cartão, a cobrança é mensal e automática — você cadastra o cartão uma vez no ambiente seguro do
        Mercado Pago e o plano renova sozinho. Pode cancelar quando quiser.
      </p>
    </>
  )
}
