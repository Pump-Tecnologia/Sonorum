import Link from 'next/link'

import { HeroMockup } from '@/components/marketing/HeroMockup'
import { IconArrow } from '@/components/marketing/icons'
import { Typewriter } from '@/components/marketing/Typewriter'
import styles from '@/components/marketing/marketing.module.css'

// Palavras que ciclam após "sem" no H1 (em verde, em nova linha).
const HERO_ENDINGS = [
  'planilhas.',
  'desorganização.',
  'controle manual.',
]

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroInner}`}>
        <div>
          {/* Eyebrow no padrão do design system — sem cara de pill SaaS */}
          <p className={styles.heroEyebrow}>Para escolas de música</p>

          {/* Quebra responsiva: no mobile parte depois de "música," p/ caber em
              2 linhas ("…música," / "sem <palavra>"); no desktop (≥640px) mantém
              a quebra original depois de "sem". */}
          <h1 className={styles.heroH1}>
            Sua escola de música,
            <br className={styles.heroBrMobile} />
            {' sem '}
            <br className={styles.heroBrDesktop} />
            <Typewriter words={HERO_ENDINGS} />
          </h1>

          <p className={styles.heroSub}>
            Agendamento, cobranças, desempenho dos alunos e material didático num sistema feito
            para quem vive de música.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
              Criar conta grátis
              <IconArrow />
            </Link>
            <Link href="#features" className={`${styles.btn} ${styles.btnOutline}`}>
              Ver como funciona
            </Link>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  )
}
