import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'sn-badge-neutral',
  success: 'sn-badge-success',
  warning: 'sn-badge-warning',
  danger: 'sn-badge-danger',
  brand: 'sn-badge-brand',
}

// Pílula de status no visual novo (.sn-badge em app/globals.css).
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={cn('sn-badge', TONES[tone])}>{children}</span>
}
