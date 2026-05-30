import Link from 'next/link'

import { HeroMockup } from '@/components/marketing/HeroMockup'
import { IconArrow } from '@/components/marketing/icons'
import { Typewriter } from '@/components/marketing/Typewriter'
import styles from '@/components/marketing/marketing.module.css'

// Finais que ciclam após a vírgula no H1.
// Cada um mantém o tom "deixa o caos pra trás · entra no compasso".
const HERO_ENDINGS = [
  'sem a planilha.',
  'sem o caderninho.',
  'sem o WhatsApp lotado.',
  'no compasso certo.',
  'afinada de verdade.',
]

// Avatares na paleta do design system — variações da marca
const AVATARS = [
  { c: '#1F3A5F', l: 'D' },
  { c: '#63C08F', l: 'M' },
  { c: '#4FAB78', l: 'R' },
  { c: '#3A5A7F', l: 'C' },
]

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroInner}`}>
        <div>
          {/* Eyebrow no padrão do design system — sem cara de pill SaaS */}
          <p className={styles.heroEyebrow}>Para escolas de música</p>

          <h1 className={styles.heroH1}>
            Sua escola de música,
            <br />
            <Typewriter words={HERO_ENDINGS} />
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

          {/* Reforço da oferta de grátis logo abaixo dos CTAs — texto humano */}
          <p className={styles.heroOffer}>
            Plano Essencial grátis para sempre · até 5 alunos · sem cartão de crédito
          </p>

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
