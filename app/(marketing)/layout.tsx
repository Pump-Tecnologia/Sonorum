import Link from 'next/link'

import { IconArrow } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={`${styles.container} ${styles.navInner}`}>
          <Link href="/" className={styles.brand}>Sonorum</Link>

          <nav className={styles.navLinks} aria-label="Navegação principal">
            <a href="#features" className={styles.navLink}>Recursos</a>
            <a href="#pricing" className={styles.navLink}>Planos</a>
            <a href="#contact" className={styles.navLink}>Contato</a>
          </nav>

          <div className={styles.navCta}>
            <Link href="/login" className={styles.navSignIn}>Entrar</Link>
            <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
              Criar conta
              <IconArrow />
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <span className={styles.brand}>Sonorum</span>
          <nav className={styles.footerLinks} aria-label="Links do rodapé">
            <a href="#">Termos de uso</a>
            <a href="#">Privacidade</a>
          </nav>
          <p className={styles.footerCopy}>© Sonorum · Gestão para escolas de música</p>
        </div>
      </footer>
    </div>
  )
}
