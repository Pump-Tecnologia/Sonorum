import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { startSaasSubscriptionCheckout } from '@/lib/actions/billing'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { SCHOOL_BRAND_COLOR_ENABLED } from '@/lib/constants/branding'
import { PLAN_FEATURES, SELLABLE_PLANS, planPrice } from '@/lib/constants/plans'
import { TRANSCRIPTION_ENABLED } from '@/lib/constants/transcription'
import { formatBRL } from '@/lib/format'
import { dateInBR } from '@/lib/timezone'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Planos' }

const TRANSCRIPTION_LINE = 'Transcrição de cifra por IA'

const ALL_FEATURE_LINES: Record<string, string[]> = {
  professional: ['Alunos e professores ilimitados', 'Financeiro completo', 'Relatórios completos'],
  premium: ['Tudo do Profissional', TRANSCRIPTION_LINE, SCHOOL_BRAND_COLOR_ENABLED ? 'Marca personalizada (logo e cores)' : 'Marca personalizada (logo e nome)'],
  solo: ['Feito para 1 professor só', 'Alunos ilimitados', 'Financeiro completo'],
  solo_pro: ['Tudo do Solo', 'Relatórios de desempenho', TRANSCRIPTION_LINE],
}

// Com a transcrição desligada, ela não é anunciada nos planos.
const FEATURE_LINES: Record<string, string[]> = Object.fromEntries(
  Object.entries(ALL_FEATURE_LINES).map(([plan, lines]) => [
    plan,
    TRANSCRIPTION_ENABLED ? lines : lines.filter((line) => line !== TRANSCRIPTION_LINE),
  ]),
)

export default async function UpgradePage() {
  const { planType, expirationDate, inGracePeriod, graceDaysRemaining } = await getPlanContext()
  const me = await getCurrentUser()

  let monthlyPrice = 0
  let teacherCount = 0
  if (me?.schoolId) {
    const supabase = await createClient()
    const [{ data: school }, { count }] = await Promise.all([
      supabase.from('schools').select('monthly_price').eq('id', me.schoolId).maybeSingle(),
      supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', me.schoolId),
    ])
    monthlyPrice = Number(school?.monthly_price ?? 0)
    teacherCount = count ?? 0
  }

  const today = dateInBR()
  const active = expirationDate != null && expirationDate >= today

  // Os planos Solo/Solo Pro (1 professor só) só aparecem pra quem já está
  // neles ou pra escola que ainda tem só 1 professor cadastrado — não faz
  // sentido oferecer pra quem já tem equipe. Escola com equipe só vê
  // Profissional/Premium; professor sozinho só vê Solo/Solo Pro.
  const isSoloEligible = planType === 'solo' || planType === 'solo_pro' || teacherCount <= 1
  const soloPlans: (typeof SELLABLE_PLANS)[number][] = ['solo', 'solo_pro']
  const visiblePlans = SELLABLE_PLANS.filter((plan) => {
    const isSoloPlan = soloPlans.includes(plan)
    return isSoloPlan ? isSoloEligible : !isSoloEligible
  })

  return (
    <>
      <PageHeader
        title="Escolha seu plano"
        subtitle={
          planType === 'free' || planType === 'solo_free'
            ? `Você está no plano ${PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES]?.label ?? 'Essencial'} (grátis)`
            : `Plano atual: ${PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES]?.label ?? planType}${
                expirationDate
                  ? ` · ${
                      active
                        ? `válido até ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                        : inGracePeriod
                          ? `venceu em ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')} (carência de ${graceDaysRemaining}d)`
                          : `venceu em ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                    }`
                  : ''
              }`
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {visiblePlans.map((plan) => {
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
        Assinando no cartão ou Pix, a cobrança é mensal e automática — você finaliza no ambiente seguro do
        Asaas e o plano renova sozinho. Pode cancelar quando quiser.
      </p>
    </>
  )
}
