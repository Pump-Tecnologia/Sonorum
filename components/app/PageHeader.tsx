import Link from 'next/link'

import styles from '@/components/app/app.module.css'
import { IconArrowLeft } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'

interface PageHeaderProps {
  title: string
  /** Dado curto sob o título (nome, contagem, data). Explicação não vai aqui: use `info`. */
  subtitle?: string
  /** Texto de apoio: fica dentro do botão "i" ao lado do título, nunca solto na tela. */
  info?: React.ReactNode
  /** Link de volta acima do título, ex.: { href: '/admin/teachers', label: 'Professores' }. */
  back?: { href: string; label: string }
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, info, back, action }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {back && (
          <Link href={back.href} className={styles.pageBack}><IconArrowLeft /> {back.label}</Link>
        )}
        <div className={styles.pageTitleRow}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {info && <InfoButton label={`Sobre ${title}`}>{info}</InfoButton>}
        </div>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.pageActions}>{action}</div>}
    </header>
  )
}
