import styles from '@/components/students/student-profile.module.css'
import { Sparkline } from '@/components/ui/Sparkline'
import type { StudentProgress } from '@/lib/data/progress'
import { cn } from '@/lib/cn'

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null
  const up = delta > 0
  return (
    <span className={cn(styles.delta, up ? styles.deltaUp : styles.deltaDown)}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
      <span className="sr-only">{up ? ' a mais que antes' : ' a menos que antes'}</span>
    </span>
  )
}

interface ProgressPanelProps {
  progress: StudentProgress
  /** Ação no canto do título (ex.: enviar relatório ao aluno). */
  action?: React.ReactNode
  /** Esconde o título "Progresso" quando a página já se chama assim (portal do aluno). */
  hideTitle?: boolean
}

export function ProgressPanel({ progress, action, hideTitle = false }: ProgressPanelProps) {
  const head = hideTitle ? null : (
    <div className={styles.panelHead}>
      <h2 id="progress-title" className={styles.panelTitle}>Progresso</h2>
      {action}
    </div>
  )
  const label = hideTitle ? { 'aria-label': 'Progresso' } : { 'aria-labelledby': 'progress-title' }

  if (!progress.hasData) {
    return (
      <section className={styles.panel} {...label}>
        {head}
        <p className={styles.empty}>
          Ainda sem aulas avaliadas.
        </p>
      </section>
    )
  }

  const { attendance, scores, bpm, goals } = progress
  // Sem nenhum laudo de desempenho, os quadros de nota ficariam vazios.
  const hasScores = scores.some((s) => s.current !== null || s.series.length > 0)

  return (
    <section className={styles.panel} {...label}>
      {head}

      {/* Notas de desempenho: evolução por dimensão */}
      {hasScores && (
      <div className={styles.scores}>
        {scores.map((s) => (
          <div key={s.key} className={styles.tile}>
            <div className={styles.tileHead}>
              <span className={styles.tileLabel}>{s.label}</span>
              <span className={styles.tileValue}>
                {s.current !== null ? <>{s.current}<small>/5</small></> : '—'}
                <Delta delta={s.delta} />
              </span>
            </div>
            <div className={styles.spark}>
              <Sparkline values={s.series} min={0} max={5} />
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Frequência, metas e andamento */}
      <div className={hasScores ? styles.stats : `${styles.stats} ${styles.statsFirst}`}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Frequência</p>
          <p className={styles.statValue}>{attendance.rate}%</p>
          <p className={styles.statSub}>{attendance.attended} presenças e {attendance.missed} faltas</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Metas</p>
          <p className={styles.statValue}>{goals.completed}/{goals.total}</p>
          <p className={styles.statSub}>concluídas</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Andamento</p>
          {bpm.song || bpm.reached ? (
            <>
              <p className={styles.statValue}>{bpm.reached ?? '—'}<small>BPM</small></p>
              <p className={styles.statSub}>{bpm.song ? `${bpm.song}: ` : ''}começou em {bpm.initial ?? '—'}</p>
              <div className={styles.spark}><Sparkline values={bpm.series} /></div>
            </>
          ) : (
            <p className={styles.statSub}>Sem registro de BPM ainda.</p>
          )}
        </div>
      </div>
    </section>
  )
}
