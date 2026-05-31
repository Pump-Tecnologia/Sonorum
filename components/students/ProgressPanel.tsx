import { Card } from '@/components/ui/Card'
import { Sparkline } from '@/components/ui/Sparkline'
import type { StudentProgress } from '@/lib/data/progress'

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return <span className="text-xs text-ink-muted">—</span>
  const up = delta > 0
  return (
    <span className={`text-xs font-semibold ${up ? 'text-accent-700' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  )
}

export function ProgressPanel({ progress }: { progress: StudentProgress }) {
  if (!progress.hasData) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-ink">Progresso</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sem dados ainda. A evolução aparece conforme as aulas e os laudos de desempenho são registrados.
        </p>
      </Card>
    )
  }

  const { attendance, scores, bpm, goals } = progress

  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-ink">Progresso</h2>

      {/* Notas de desempenho — evolução por dimensão */}
      <div className="grid gap-3 sm:grid-cols-2">
        {scores.map((s) => (
          <div key={s.key} className="rounded-xl border border-hairline p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{s.label}</span>
              <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                {s.current !== null ? `${s.current}/5` : '—'}
                <Delta delta={s.delta} />
              </span>
            </div>
            <div className="mt-2 text-brand-500">
              <Sparkline values={s.series} min={0} max={5} />
            </div>
          </div>
        ))}
      </div>

      {/* Andamento + frequência + metas */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-hairline p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Andamento</p>
          {bpm.song || bpm.reached ? (
            <>
              {bpm.song && <p className="mt-1 text-sm font-semibold text-ink">{bpm.song}</p>}
              <p className="text-sm text-ink-muted">
                {bpm.initial ?? '—'} → <strong className="text-ink">{bpm.reached ?? '—'}</strong> BPM
              </p>
              <div className="mt-1 text-brand-500">
                <Sparkline values={bpm.series} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">—</p>
          )}
        </div>

        <div className="rounded-xl border border-hairline p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Frequência</p>
          <p className="mt-1 text-2xl font-bold text-ink">{attendance.rate}%</p>
          <p className="text-sm text-ink-muted">
            {attendance.attended} presenças · {attendance.missed} faltas
          </p>
        </div>

        <div className="rounded-xl border border-hairline p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Metas</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {goals.completed}/{goals.total}
          </p>
          <p className="text-sm text-ink-muted">concluídas</p>
        </div>
      </div>
    </Card>
  )
}
