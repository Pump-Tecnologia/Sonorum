import Link from 'next/link'

import { IconArrow, IconCheck } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

// Leva ao cadastro já com o plano escolhido; ao criar a conta, vai direto pro
// pagamento (checkout do plano), sem passar por tela de planos de novo.
function subscribeLink(plan: 'professional' | 'premium'): string {
  return `/register?plan=${plan}`
}

export function Pricing() {
  return (
    <section id="pricing" className={styles.pricing}>
      <div className={styles.container}>
        <div className={styles.sectionIntro}>
          <span className={`${styles.sectionLabel} ${styles.sectionLabelLight}`}>Planos</span>
          <h2 className={`${styles.sectionH2} ${styles.sectionH2Light}`}>
            Escolha o ritmo
            <br />
            <em>da sua escola.</em>
          </h2>
          <p className={`${styles.sectionSub} ${styles.sectionSubLight}`}>
            Sem fidelidade. Sem taxa de instalação. Cancele quando quiser.
          </p>
        </div>

        <div className={styles.pricingCards}>
          {/* Essencial */}
          <div className={styles.planCard}>
            <p className={styles.planName}>Essencial</p>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R$ 0</span>
              <span className={styles.planPeriod}>/mês</span>
            </div>
            <p className={styles.planDesc}>
              Para professores particulares começando a se organizar.
            </p>
            <ul className={styles.planFeatures}>
              <li><IconCheck /> Até 5 alunos</li>
              <li><IconCheck /> Agenda compartilhada</li>
              <li><IconCheck /> Portal do aluno</li>
              <li><IconCheck /> Biblioteca pedagógica</li>
            </ul>
            <Link href="/register" className={`${styles.planCta} ${styles.planCtaGhost}`}>
              Começar grátis
            </Link>
          </div>

          {/* Profissional — featured */}
          <div className={`${styles.planCard} ${styles.planCardFeatured}`}>
            <span className={styles.planBadge}>Mais escolhido</span>
            <p className={styles.planName}>Profissional</p>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R$ 99</span>
              <span className={styles.planPeriod}>/mês</span>
            </div>
            <p className={styles.planDesc}>
              Para escolas em crescimento que precisam de controle total.
            </p>
            <ul className={styles.planFeatures}>
              <li><IconCheck /> Alunos ilimitados</li>
              <li><IconCheck /> Professores ilimitados</li>
              <li><IconCheck /> Gestão financeira completa</li>
              <li><IconCheck /> Relatórios de desempenho</li>
              <li><IconCheck /> Repasse de professores</li>
            </ul>
            <Link href={subscribeLink('professional')} className={`${styles.planCta} ${styles.planCtaPrimary}`}>
              Assinar Profissional
              <IconArrow />
            </Link>
          </div>

          {/* Premium */}
          <div className={styles.planCard}>
            <p className={styles.planName}>Premium</p>
            <div className={styles.planPrice}>
              <span className={styles.planAmount}>R$ 199</span>
              <span className={styles.planPeriod}>/mês</span>
            </div>
            <p className={styles.planDesc}>
              Para instituições que querem identidade própria e suporte dedicado.
            </p>
            <ul className={styles.planFeatures}>
              <li><IconCheck /> Tudo do Profissional</li>
              <li><IconCheck /> Branding personalizado</li>
              <li><IconCheck /> Suporte prioritário</li>
              <li><IconCheck /> Onboarding dedicado</li>
            </ul>
            <Link href={subscribeLink('premium')} className={`${styles.planCta} ${styles.planCtaGhost}`}>
              Assinar Premium
              <IconArrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
