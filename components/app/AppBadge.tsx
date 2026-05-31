import styles from '@/components/app/app.module.css'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const TONE_CLASS: Record<Tone, string> = {
  neutral: styles.badgeNeutral,
  brand: styles.badgeBrand,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
}

export function AppBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: Tone
}) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>{children}</span>
}
