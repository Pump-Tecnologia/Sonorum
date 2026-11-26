import { PageHeader } from '@/components/app/PageHeader'
import { IconCheck } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import styles from '@/components/billing/locked.module.css'
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
  // Sem data de vencimento o plano vale sem prazo (como em getPlanContext): conta como ativo.
  const active = expirationDate == null || expirationDate >= today

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
        info="A cobrança é mensal e automática, no cartão ou no Pix. Você finaliza no ambiente seguro do Asaas, o plano renova sozinho e dá para cancelar quando quiser."
        subtitle={
          planType === 'free' || planType === 'solo_free'
            ? `Você está no plano ${PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES]?.label ?? 'Essencial'} (grátis)`
            : `Plano atual: ${PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES]?.label ?? planType}${
                expirationDate
                  ? `, ${
                      active
                        ? `válido até ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                        : inGracePeriod
                          ? `venceu em ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}, com ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'dia' : 'dias'} de carência`
                          : `venceu em ${new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                    }`
                  : ''
              }`
        }
      />

      <ul className={styles.plans} aria-label="Planos">
        {visiblePlans.map((plan) => {
          const f = PLAN_FEATURES[plan]
          const price = planPrice(plan, monthlyPrice)
          const isCurrent = planType === plan && active
          return (
            <li key={plan} className={styles.plan} data-current={isCurrent || undefined}>
              <div className={styles.planHead}>
                <h2 className={styles.planName}>{f.label}</h2>
                {isCurrent && <StatusPill tone="success">Plano atual</StatusPill>}
              </div>
              <p className={styles.price}>{formatBRL(price)}<small>/mês</small></p>
              <ul className={styles.planLines}>
                {FEATURE_LINES[plan]?.map((line) => (
                  <li key={line}><span className={styles.check}><IconCheck /></span>{line}</li>
                ))}
              </ul>
              <CheckoutButton
                action={startSaasSubscriptionCheckout}
                planType={plan}
                label={isCurrent && expirationDate ? 'Renovar assinatura' : 'Assinar'}
                variant={isCurrent ? 'outline' : 'primary'}
              />
            </li>
          )
        })}
      </ul>
    </>
  )
}
