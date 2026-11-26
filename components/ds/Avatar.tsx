import styles from '@/components/ds/ds.module.css'
import type { InstrumentTone } from '@/lib/constants/instrument-tone'
import { cn } from '@/lib/cn'

// Iniciais do primeiro e do último nome.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

interface AvatarProps {
  name: string
  /** Cor do instrumento do aluno; sem instrumento, o verde padrão. */
  tone?: InstrumentTone
  size?: 'md' | 'lg'
  className?: string
}

/** Avatar de iniciais na cor do instrumento (o app ainda não guarda foto). */
export function Avatar({ name, tone = 'outro', size = 'md', className }: AvatarProps) {
  return (
    <span className={cn(styles.avatar, size === 'lg' && styles.avatarLarge, className)} data-tone={tone} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}
