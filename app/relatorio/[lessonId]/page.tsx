import { PrintButton } from '@/components/app/PrintButton'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Relatório de aula' }

const SKILLS: { key: string; label: string }[] = [
  { key: 'technique_score', label: 'Técnica' },
  { key: 'theory_score', label: 'Teoria' },
  { key: 'repertoire_score', label: 'Repertório' },
  { key: 'practice_score', label: 'Dedicação' },
]

type Report = Record<string, number | string | null>

// Página pública (sem login) do relatório de aula — formatada e baixável (PDF).
// Lê com service-role; expõe só o que o aluno já pode ver (notas, música, BPM,
// observações visíveis). O id da aula é um UUID não adivinhável.
export default async function ReportPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const admin = await createAdminClient()

  const { data: lesson } = await admin
    .from('lessons')
    .select('id, title, start_datetime, notes, student_id, school_id, report:lesson_reports(technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm)')
    .eq('id', lessonId)
    .maybeSingle()

  const report = (Array.isArray(lesson?.report) ? lesson?.report[0] : lesson?.report) as Report | null

  if (!lesson || !report) {
    return (
      <Shell>
        <p className="text-center text-sm text-ink-muted">Relatório não encontrado ou ainda não preenchido.</p>
      </Shell>
    )
  }

  const [{ data: school }, { data: student }] = await Promise.all([
    admin.from('schools').select('name, custom_name, brand_primary, logo_path').eq('id', lesson.school_id ?? '').maybeSingle(),
    lesson.student_id ? admin.from('users').select('name').eq('id', lesson.student_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const schoolName = school?.custom_name || school?.name || 'Escola'
  const accent = school?.brand_primary || '#2b4c79'
  const dateLabel = new Date(lesson.start_datetime).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const initialBpm = report.initial_bpm as number | null
  const reachedBpm = report.reached_bpm as number | null

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {school?.logo_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_path} alt="" className="h-10 w-10 rounded-lg object-contain" />
          )}
          <span className="text-lg font-semibold" style={{ color: accent }}>{schoolName}</span>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-ink">Relatório de aula</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {student?.name ? `${student.name} · ` : ''}{lesson.title} · {dateLabel}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SKILLS.map((s) => {
          const v = Number(report[s.key] ?? 0)
          return (
            <div key={s.key} className="rounded-xl border border-hairline p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{s.label}</span>
                <span className="text-sm font-bold" style={{ color: accent }}>{v}/5</span>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="h-2 flex-1 rounded-full" style={{ backgroundColor: n <= v ? accent : '#E4E8EF' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {(report.current_song || (initialBpm && reachedBpm)) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.current_song && (
            <div className="rounded-xl border border-hairline p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Música atual</p>
              <p className="mt-1 font-medium text-ink">{String(report.current_song)}</p>
            </div>
          )}
          {initialBpm && reachedBpm && (
            <div className="rounded-xl border border-hairline p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">BPM</p>
              <p className="mt-1 font-medium text-ink">{initialBpm} → {reachedBpm}</p>
            </div>
          )}
        </div>
      )}

      {lesson.notes && (
        <div className="mt-4 rounded-xl border border-hairline p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Observações</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{lesson.notes}</p>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-muted">{schoolName} · gerado pelo Sonorum</p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-muted px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl rounded-3xl border border-hairline bg-surface p-8 shadow-sm print:border-0 print:shadow-none">
        {children}
      </div>
    </main>
  )
}
