'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { IconArrow } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

const LOGO = '/brand/logo-vazado.png'
const SCROLL_THRESHOLD = 24 // px

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={styles.nav} data-scrolled={scrolled || undefined}>
      <div className={`${styles.container} ${styles.navInner}`}>
        <Link href="/" className={styles.brand} aria-label="Sonorum">
          <Image
            src={LOGO}
            alt=""
            width={36}
            height={36}
            priority
            className={styles.brandMark}
          />
          <span className={styles.brandWord} aria-hidden={scrolled}>
            Sonorum
          </span>
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
  )
}
