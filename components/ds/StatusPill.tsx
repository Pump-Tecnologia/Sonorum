import styles from '@/components/ds/ds.module.css'
import type { StatusTone } from '@/lib/constants/lessons'
import { cn } from '@/lib/cn'

const TONE: Record<StatusTone, string> = {
  neutral: styles['status-neutral'],
  brand: styles['status-brand'],
  success: styles['status-success'],
  warning: styles['status-warning'],
  danger: styles['status-danger'],
}

export function StatusPill({ tone = 'neutral', children }: { tone?: StatusTone; children: React.ReactNode }) {
  return <span className={cn(styles.status, TONE[tone])}>{children}</span>
}
