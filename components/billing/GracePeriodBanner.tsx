import Link from 'next/link'
import styles from '@/components/app/app.module.css'

export interface GracePeriodBannerProps {
  inGracePeriod: boolean
  graceDaysRemaining: number
  isExpired: boolean
  expirationDate: string | null
}

// Banner fixo exibido para administradores quando a assinatura do Sonorum
// está vencida (em período de carência de 5 dias ou já expirada).
export function GracePeriodBanner({
  inGracePeriod,
  graceDaysRemaining,
  isExpired,
  expirationDate,
}: GracePeriodBannerProps) {
  if (!expirationDate || (!inGracePeriod && !isExpired)) return null

  const formattedDate = new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')

  if (inGracePeriod) {
    const dayLabel = graceDaysRemaining === 1 ? '1 dia restante' : `${graceDaysRemaining} dias restantes`
    return (
      <aside aria-label="Aviso de carência de assinatura" className={styles.gracePeriodWarning}>
        <div className={styles.gracePeriodInner}>
          <p>
            ⚠️ <strong>Sua assinatura do Sonorum venceu em {formattedDate}.</strong> Você tem {dayLabel} de carência para regularizar o pagamento antes da limitação dos recursos.
          </p>
          <Link href="/upgrade" className={styles.gracePeriodBtnWarning}>
            Regularizar assinatura
          </Link>
        </div>
      </aside>
    )
  }

  return (
    <aside aria-label="Aviso de assinatura expirada" className={styles.gracePeriodDanger}>
      <div className={styles.gracePeriodInner}>
        <p>
          ⚠️ <strong>Sua assinatura do Sonorum expirou em {formattedDate}</strong> e o período de carência encerrou. O acesso foi reduzido aos recursos do plano Essencial gratuito.
        </p>
        <Link href="/upgrade" className={styles.gracePeriodBtnDanger}>
          Reativar plano
        </Link>
      </div>
    </aside>
  )
}
