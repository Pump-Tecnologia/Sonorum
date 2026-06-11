import Link from 'next/link'

import { IconArrow, IconCheck } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

// Leva ao cadastro já com o plano escolhido; ao criar a conta, vai direto pro
// pagamento (checkout do plano), sem passar por tela de planos de novo.
function subscribeLink(plan: 'professional' | 'premium'): string {
  return `/register?plan=${plan}`
}

// Plano sob medida não tem auto-serviço: leva ao contato comercial (WhatsApp).
function customPlanContactLink(): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent('Olá! Tenho interesse em um plano sob medida do Sonorum.')
  return `https://wa.me/${number}?text=${message}`
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
              <li><IconCheck /> Cobrança via PIX</li>
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
              <li><IconCheck /> Tudo do Essencial</li>
              <li><IconCheck /> Alunos ilimitados</li>
              <li><IconCheck /> Professores ilimitados</li>
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
              <li>
                <IconCheck />
                <span>Cobrança automática (boleto e cartão) <span className={styles.planSoon}>em breve</span></span>
              </li>
              <li><IconCheck /> Transcrição de aulas com IA</li>
              <li><IconCheck /> Notificações via WhatsApp</li>
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

        {/* Plano sob medida — sem auto-serviço, leva ao contato comercial */}
        <div className={styles.planCustom}>
          <div className={styles.planCustomText}>
            <span className={styles.planCustomTag}>Sob medida</span>
            <h3>Precisa de algo além do Premium?</h3>
            <p>
              Recursos exclusivos, integrações dedicadas e atendimento sob medida para redes e
              instituições. Preço sob consulta.
            </p>
          </div>
          <a
            href={customPlanContactLink()}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.btnDark}`}
          >
            Falar com a gente
            <IconArrow />
          </a>
        </div>
      </div>
    </section>
  )
}
