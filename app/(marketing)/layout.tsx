import Image from 'next/image'
import Link from 'next/link'

import { IconArrow } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

// Logos do design system (PNGs em public/brand/).
// - logo-fundo-branco: marca completa (verde + azul) — usada sobre canvas claro
// - logo-branco: marca em monocromático claro — usada sobre o azul escuro do footer
const LOGO_LIGHT_BG = '/brand/logo-fundo-branco.png'
const LOGO_DARK_BG = '/brand/logo-branco.png'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={`${styles.container} ${styles.navInner}`}>
          <Link href="/" className={styles.brand} aria-label="Sonorum">
            <Image
              src={LOGO_LIGHT_BG}
              alt=""
              width={36}
              height={36}
              priority
              className={styles.brandMark}
            />
            <span className={styles.brandWord}>Sonorum</span>
          </Link>

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
          <Link href="/" className={styles.footerBrand} aria-label="Sonorum">
            <Image
              src={LOGO_DARK_BG}
              alt=""
              width={32}
              height={32}
              className={styles.brandMark}
            />
            <span className={styles.footerBrandWord}>Sonorum</span>
          </Link>

          <nav className={styles.footerLinks} aria-label="Links do rodapé">
            <a href="#features">Recursos</a>
            <a href="#pricing">Planos</a>
            <a href="#">Termos de uso</a>
            <a href="#">Privacidade</a>
          </nav>

          <p className={styles.footerCopy}>© Sonorum · Gestão para escolas de música</p>
        </div>
      </footer>
    </div>
  )
}
