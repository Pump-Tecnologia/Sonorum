import Image from 'next/image'
import Link from 'next/link'

import { SiteHeader } from '@/components/marketing/SiteHeader'
import styles from '@/components/marketing/marketing.module.css'

// Logo vazado — versão única usada no cabeçalho (sobre canvas claro)
// e no rodapé (sobre o ink do design system).
const LOGO_VAZADO = '/brand/logo-vazado.png'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <main>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <Link href="/" className={styles.footerBrand} aria-label="Sonorum">
              <Image
                src={LOGO_VAZADO}
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
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>© Sonorum · Gestão para escolas de música</p>
            <p className={styles.footerCredit}>
              Desenvolvido por{' '}
              <a href="https://pumpsites.com.br" target="_blank" rel="noopener noreferrer">
                Pump
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
