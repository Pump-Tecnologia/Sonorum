import Link from 'next/link'

import { IconArrow } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

function waLink(): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent('Olá! Gostaria de conhecer melhor o Sonorum.')
  return `https://wa.me/${number}?text=${message}`
}

export function CTASection() {
  return (
    <section id="contact" className={styles.ctaSection}>
      <div className={`${styles.container} ${styles.ctaInner}`}>
        <div className={styles.ctaText}>
          <h2 className={styles.ctaH2}>
            Pronto pra deixar
            <br />
            a planilha pra trás?
          </h2>
          <p>Crie sua conta em menos de 2 minutos. Sem cartão de crédito.</p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/register" className={`${styles.btn} ${styles.btnDark}`}>
            Criar conta grátis
            <IconArrow />
          </Link>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnOutline}`} style={{ background: 'transparent', color: '#fff', borderColor: 'rgb(255 255 255 / 0.3)' }}>
            Falar com a gente
          </a>
        </div>
      </div>
    </section>
  )
}
