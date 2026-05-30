import Link from 'next/link'

import { HeroMockup } from '@/components/marketing/HeroMockup'
import { IconArrow } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

const AVATARS = [
  { c: '#4E9AF1', l: 'D' },
  { c: '#F16A4E', l: 'M' },
  { c: '#A74EF1', l: 'R' },
  { c: '#F1C84E', l: 'C' },
]

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroInner}`}>
        <div>
          <span className={styles.heroTag}>
            <span className={styles.heroTagDot} />
            Primeiro mês gratuito
          </span>

          <h1 className={styles.heroH1}>
            Sua escola de música,
            <br />
            <em>sem a planilha.</em>
          </h1>

          <p className={styles.heroSub}>
            Agendamento, cobranças, desempenho dos alunos e material didático num sistema feito
            para quem vive de música — não de TI.
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

          <div className={styles.heroTrust}>
            <div className={styles.trustAvatars}>
              {AVATARS.map((a) => (
                <span key={a.l} className={styles.trustAvatar} style={{ background: a.c }}>
                  {a.l}
                </span>
              ))}
            </div>
            <p className={styles.trustText}>
              Professores de todo o Brasil já usam o Sonorum
            </p>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  )
}
