import { LinkButton } from '@/components/ds/Button'
import styles from '@/components/app/app.module.css'

export interface GracePeriodBannerProps {
  inGracePeriod: boolean
  graceDaysRemaining: number
  isExpired: boolean
  expirationDate: string | null
}

// Aviso no topo para administradores quando a assinatura do Sonorum está
// vencida (em período de carência de 5 dias ou já expirada).
export function GracePeriodBanner({
  inGracePeriod,
  graceDaysRemaining,
  isExpired,
  expirationDate,
}: GracePeriodBannerProps) {
  if (!expirationDate || (!inGracePeriod && !isExpired)) return null

  const formattedDate = new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')

  if (inGracePeriod) {
    const days = graceDaysRemaining === 1 ? 'Falta 1 dia' : `Faltam ${graceDaysRemaining} dias`
    return (
      <aside aria-label="Assinatura vencida" className={`${styles.notice} ${styles.noticeWarning}`}>
        <p className={styles.noticeText}>
          <strong>Sua assinatura venceu em {formattedDate}.</strong> {days} para regularizar antes de os recursos serem limitados.
        </p>
        <LinkButton href="/upgrade" size="sm" className={styles.noticeAction}>Regularizar</LinkButton>
      </aside>
    )
  }

  return (
    <aside aria-label="Assinatura expirada" className={`${styles.notice} ${styles.noticeDanger}`}>
      <p className={styles.noticeText}>
        <strong>Sua assinatura expirou em {formattedDate}</strong> e o acesso voltou para os recursos do plano Essencial.
      </p>
      <LinkButton href="/upgrade" size="sm" className={styles.noticeAction}>Reativar plano</LinkButton>
    </aside>
  )
}
