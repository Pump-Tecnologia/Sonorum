import { createClient } from '@/lib/supabase/server'

// Agregação de progresso do aluno a partir dos dados já existentes
// (lesson_reports + lessons.status + student_goals). Sem schema novo.

const SCORE_DIMS = [
  { key: 'technique_score', label: 'Técnica' },
  { key: 'theory_score', label: 'Teoria' },
  { key: 'repertoire_score', label: 'Repertório' },
  { key: 'practice_score', label: 'Dedicação' },
] as const

export interface ScoreDimension {
  key: string
  label: string
  series: number[]
  current: number | null
  delta: number | null
}

export interface StudentProgress {
  lessonsCount: number
  attendance: { attended: number; missed: number; total: number; rate: number }
  scores: ScoreDimension[]
  bpm: { song: string | null; initial: number | null; reached: number | null; series: number[] }
  goals: { completed: number; total: number }
  hasData: boolean
}

interface ReportRow {
  technique_score: number | null
  theory_score: number | null
  repertoire_score: number | null
  practice_score: number | null
  current_song: string | null
  initial_bpm: number | null
  reached_bpm: number | null
}

interface LessonRow {
  status: string
  lesson_reports: ReportRow[] | ReportRow | null
}

export async function getStudentProgress(studentId: string): Promise<StudentProgress> {
  const supabase = await createClient()

  const [{ data: lessonsRaw }, { data: goalsRaw }] = await Promise.all([
    supabase
      .from('lessons')
      .select(
        'status, lesson_reports(technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm)',
      )
      .eq('student_id', studentId)
      .order('start_datetime', { ascending: true }),
    supabase.from('student_goals').select('completed').eq('student_id', studentId),
  ])

  const lessons = (lessonsRaw ?? []) as unknown as LessonRow[]

  // Frequência (all-time): presença = realizada/atrasada, falta = missed.
  let attended = 0
  let missed = 0
  for (const l of lessons) {
    if (l.status === 'completed' || l.status === 'late') attended++
    else if (l.status === 'missed') missed++
  }
  const total = attended + missed
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0

  // Laudos em ordem cronológica (só aulas que têm laudo).
  const reports = lessons
    .map((l) => (Array.isArray(l.lesson_reports) ? l.lesson_reports[0] : l.lesson_reports))
    .filter((r): r is ReportRow => Boolean(r))

  const scores: ScoreDimension[] = SCORE_DIMS.map((dim) => {
    const series = reports
      .map((r) => Number(r[dim.key]))
      .filter((n) => Number.isFinite(n) && n > 0)
    const current = series.length ? series[series.length - 1]! : null
    const prev = series.length > 1 ? series[series.length - 2]! : null
    const delta = current !== null && prev !== null ? current - prev : null
    return { key: dim.key, label: dim.label, series, current, delta }
  })

  // Andamento: série de BPM alcançado + último laudo com música.
  const bpmSeries = reports
    .map((r) => Number(r.reached_bpm))
    .filter((n) => Number.isFinite(n) && n > 0)
  const lastWithSong = [...reports].reverse().find((r) => r.current_song || r.reached_bpm)
  const bpm = {
    song: lastWithSong?.current_song ?? null,
    initial: lastWithSong?.initial_bpm ?? null,
    reached: lastWithSong?.reached_bpm ?? null,
    series: bpmSeries,
  }

  const goalsRows = (goalsRaw ?? []) as { completed: boolean }[]
  const goals = {
    completed: goalsRows.filter((g) => g.completed).length,
    total: goalsRows.length,
  }

  return {
    lessonsCount: lessons.length,
    attendance: { attended, missed, total, rate },
    scores,
    bpm,
    goals,
    hasData: reports.length > 0 || total > 0 || goals.total > 0,
  }
}
