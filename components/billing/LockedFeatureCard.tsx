import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
  const defaultCta = isExpired ? 'Regularizar assinatura' : 'Fazer upgrade de plano'
  const buttonLabel = ctaLabel ?? defaultCta

  return (
    <Card className="max-w-3xl border-brand-200/80 bg-linear-to-b from-brand-50/50 to-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-semibold" aria-hidden="true">
            🔒
          </span>
          <div>
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-sm font-medium text-brand-700">{subtitle}</p>}
          </div>
        </div>
        {isExpired && !inGracePeriod && (
          <Badge tone="danger">Assinatura expirada</Badge>
        )}
        {inGracePeriod && (
          <Badge tone="warning">Carência ({graceDaysRemaining}d restantes)</Badge>
        )}
        {!isExpired && !inGracePeriod && (
          <Badge tone="brand">Recurso Exclusivo</Badge>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        {description}
      </p>

      <div className="mt-6 rounded-2xl border border-brand-100/80 bg-white/80 p-5 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          O que você pode fazer com este recurso:
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm text-ink">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="text-brand-600 font-bold shrink-0">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-brand-100 pt-5">
        <div>
          <p className="text-xs text-ink-muted">{planRequirement}</p>
        </div>
        <Link href={upgradeUrl}>
          <Button>{buttonLabel}</Button>
        </Link>
      </div>
    </Card>
  )
}
