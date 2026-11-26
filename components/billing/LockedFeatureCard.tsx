import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight, IconCheck } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import styles from '@/components/billing/locked.module.css'

export interface LockedFeatureCardProps {
  title: string
  subtitle?: string
  description: string
  benefits: string[]
  planRequirement?: string
  upgradeUrl?: string
  ctaLabel?: string
  isExpired?: boolean
  inGracePeriod?: boolean
  graceDaysRemaining?: number
}

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
)

// Apresentação visual alinhada para recursos restritos a planos pagos.
// Exibida inline quando a escola está no plano gratuito ou quando o plano expirou.
export function LockedFeatureCard({
  title,
  subtitle,
  description,
  benefits,
  planRequirement = 'Disponível nos planos Solo ou Profissional',
  upgradeUrl = '/upgrade',
  ctaLabel,
  isExpired = false,
  inGracePeriod = false,
  graceDaysRemaining = 0,
}: LockedFeatureCardProps) {
  const buttonLabel = ctaLabel ?? (isExpired ? 'Regularizar assinatura' : 'Ver planos')

  return (
    <section className={styles.card} aria-labelledby="locked-title">
      <div className={styles.head}>
        <div className={styles.who}>
          <span className={styles.mark}><IconLock /></span>
          <div>
            <h2 id="locked-title" className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {isExpired && !inGracePeriod && <StatusPill tone="danger">Assinatura expirada</StatusPill>}
        {inGracePeriod && <StatusPill tone="warning">Carência: {graceDaysRemaining} {graceDaysRemaining === 1 ? 'dia' : 'dias'}</StatusPill>}
        {!isExpired && !inGracePeriod && <StatusPill tone="brand">Recurso dos planos pagos</StatusPill>}
      </div>

      <p className={styles.description}>{description}</p>

      <ul className={styles.benefits} aria-label="O que você ganha">
        {benefits.map((b) => (
          <li key={b} className={styles.benefit}>
            <span className={styles.check}><IconCheck /></span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className={styles.foot}>
        <p className={styles.requirement}>{planRequirement}</p>
        <LinkButton href={upgradeUrl}>{buttonLabel} <IconArrowRight /></LinkButton>
      </div>
    </section>
  )
}
