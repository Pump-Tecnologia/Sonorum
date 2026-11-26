import { IconExternal } from '@/components/ds/icons'
import styles from '@/components/ds/ds.module.css'

interface ExternalLinkProps {
  href: string
  className?: string
  children: React.ReactNode
  /** Mostra o ícone de link externo depois do texto. Desligue quando o link já traz o próprio ícone (WhatsApp). */
  showIcon?: boolean
}

/** Link que abre em nova aba: ícone de link externo e aviso para leitor de tela. */
export function ExternalLink({ href, className, children, showIcon = true }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      {showIcon && <IconExternal className={styles.externalIcon} />}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
