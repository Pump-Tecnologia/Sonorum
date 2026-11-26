import Image from 'next/image'

import styles from '@/components/app/status.module.css'
import { cn } from '@/lib/cn'

const LOGO = '/brand/logo-vazado.png'

interface StatusScreenProps {
  /** Etiqueta curta acima do título (ex.: "Erro 404"). */
  code: string
  title: string
  message: string
  actions: React.ReactNode
  /** Identificador do erro para cruzar com os logs do servidor. */
  digest?: string
  /** Ocupa a tela inteira, com o fundo do app (fora do menu lateral). */
  fullPage?: boolean
}

// Tela de status (404, erro): cartão de vidro centrado com a marca e as saídas.
export function StatusScreen({ code, title, message, actions, digest, fullPage = false }: StatusScreenProps) {
  return (
    <div className={cn(styles.stage, fullPage && styles.fullPage)}>
      <section className={styles.card} aria-labelledby="status-title">
        <Image src={LOGO} alt="" width={44} height={44} className={styles.mark} />
        <p className={styles.code}>{code}</p>
        <h1 id="status-title" className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>{actions}</div>
        {digest && <p className={styles.digest}>Código do erro: {digest}</p>}
      </section>
    </div>
  )
}
