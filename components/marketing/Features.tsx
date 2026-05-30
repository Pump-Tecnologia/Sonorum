import { IconCheck } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

export function Features() {
  return (
    <section id="features" className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>O que o Sonorum resolve</span>
          <h2 className={styles.sectionH2}>
            Cada detalhe da sua escola,
            <br />
            <em>no lugar certo.</em>
          </h2>
        </div>

        <div className={styles.featuresGrid}>
          {/* ─── Agenda ───────────────────────────────────────────── */}
          <article className={styles.featureCard}>
            <div className={styles.featureVisual}>
              <div className={styles.fvWeek}>
                {['S', 'T', 'Q', 'Q', 'S'].map((d, i) => (
                  <div key={i} className={styles.fvDay}>
                    <span className={styles.fvDayLabel}>{d}</span>
                    <div className={styles.fvLessons}>
                      <span className={styles.fvLesson} style={{ height: 28, background: '#47D481', opacity: 0.9 }} />
                      <span className={styles.fvLesson} style={{ height: 18, background: '#1E3A5F', opacity: 0.7, marginTop: 4 }} />
                    </div>
                  </div>
                ))}
                <div className={styles.fvDay}>
                  <span className={styles.fvDayLabel}>S</span>
                </div>
                <div className={styles.fvDay}>
                  <span className={styles.fvDayLabel}>D</span>
                </div>
              </div>
              <div className={styles.fvCalLegend}>
                <span className={styles.fvDot} style={{ background: '#47D481' }} />Piano
                <span style={{ width: 12 }} />
                <span className={styles.fvDot} style={{ background: '#1E3A5F' }} />Violão
              </div>
            </div>
            <div className={styles.featureText}>
              <h3>Agenda sem conflito</h3>
              <p>
                Veja todos os horários dos professores num calendário compartilhado. Identifique
                janelas livres, evite sobreposições e recoloque aulas canceladas em segundos.
              </p>
              <ul className={styles.featureList}>
                <li><IconCheck /> Vista semanal e mensal</li>
                <li><IconCheck /> Aulas recorrentes automáticas</li>
                <li><IconCheck /> Notificação de cancelamento</li>
              </ul>
            </div>
          </article>

          {/* ─── Financeiro ──────────────────────────────────────── */}
          <article className={`${styles.featureCard} ${styles.featureCardAlt}`}>
            <div className={styles.featureText}>
              <h3>Financeiro sem planilha</h3>
              <p>
                Cobranças geradas automaticamente por matrícula. Saiba quem pagou, quem está em
                atraso e quanto a escola vai receber este mês — sem abrir Excel.
              </p>
              <ul className={styles.featureList}>
                <li><IconCheck /> Cobranças por plano de matrícula</li>
                <li><IconCheck /> Status: pendente, pago, atrasado</li>
                <li><IconCheck /> Relatório de repasse por professor</li>
              </ul>
            </div>
            <div className={styles.featureVisual}>
              <div className={styles.fvCharges}>
                <ChargeRow name="Ana Lima" val="R$ 180" badge="paid" />
                <ChargeRow name="Carlos Matos" val="R$ 220" badge="overdue" />
                <ChargeRow name="Julia Costa" val="R$ 150" badge="pending" />
                <ChargeRow name="Pedro Silva" val="R$ 180" badge="paid" />
              </div>
              <div className={styles.fvTotalBar}>
                <span>Total recebido</span>
                <strong>R$ 3.840 / R$ 4.800</strong>
              </div>
            </div>
          </article>

          {/* ─── Alunos ──────────────────────────────────────────── */}
          <article className={styles.featureCard}>
            <div className={styles.featureVisual}>
              <div className={styles.fvStudentCard}>
                <div className={styles.fvStudentTop}>
                  <div className={styles.fvStudentAvatar}>JC</div>
                  <div>
                    <p className={styles.fvStudentName}>Julia Costa</p>
                    <p className={styles.fvStudentMeta}>Canto · 14h às 15h · 3ª</p>
                  </div>
                </div>
                <div className={styles.fvStudentScore}>
                  <Bar label="Técnica" pct={78} />
                  <Bar label="Repertório" pct={65} />
                  <Bar label="Frequência" pct={90} />
                </div>
              </div>
            </div>
            <div className={styles.featureText}>
              <h3>Histórico completo do aluno</h3>
              <p>
                Cada aluno tem um perfil com frequência, evolução técnica, repertório e notas
                do professor. O aluno acessa tudo pelo próprio portal.
              </p>
              <ul className={styles.featureList}>
                <li><IconCheck /> Relatório de aula por aula</li>
                <li><IconCheck /> Metas e observações permanentes</li>
                <li><IconCheck /> Portal de acesso para o aluno</li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

const BADGE_LABELS = { paid: 'Pago', overdue: 'Atrasado', pending: 'Pendente' } as const
const BADGE_STYLES = { paid: styles.fvBadgePaid, overdue: styles.fvBadgeOverdue, pending: styles.fvBadgePending } as const

function ChargeRow({ name, val, badge }: { name: string; val: string; badge: 'paid' | 'overdue' | 'pending' }) {
  return (
    <div className={styles.fvCharge}>
      <span className={styles.fvChargeName}>{name}</span>
      <span className={styles.fvChargeVal}>{val}</span>
      <span className={`${styles.fvBadge} ${BADGE_STYLES[badge]}`}>{BADGE_LABELS[badge]}</span>
    </div>
  )
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className={styles.fvBarGroup}>
      <span className={styles.fvBarLabel}>{label}</span>
      <div className={styles.fvBar}>
        <div className={styles.fvBarFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
