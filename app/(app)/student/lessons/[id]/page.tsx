import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Aula' }

const SCORE_LABELS: Record<string, string> = {
  technique_score: 'Técnica',
  theory_score: 'Teoria',
  repertoire_score: 'Repertório',
  practice_score: 'Dedicação',
}

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, status, notes, goals, users!lessons_teacher_id_fkey(name)')
    .eq('id', id)
    .eq('student_id', user!.id)
    .maybeSingle()

  if (!lesson) notFound()

  const { data: report } = await supabase
    .from('lesson_reports')
    .select('technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm')
    .eq('lesson_id', id)
    .maybeSingle()

  type TeacherRow = { name: string }
  const teacher = lesson.users as TeacherRow | null

  return (
    <>
      <PageHeader
        title={lesson.title}
        subtitle={new Date(lesson.start_datetime).toLocaleString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long',
          hour: '2-digit', minute: '2-digit',
        })}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Detalhes</h2>
            <Badge tone={lesson.status === 'completed' ? 'success' : 'neutral'}>
              {lesson.status === 'completed' ? 'Realizada' : 'Agendada'}
            </Badge>
          </div>
          <dl className="space-y-3 text-sm">
            {teacher?.name && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Professor</dt>
                <dd className="font-medium">{teacher.name}</dd>
              </div>
            )}
            {lesson.goals && (
              <div>
                <dt className="mb-1 text-ink-muted">Objetivos</dt>
                <dd className="whitespace-pre-wrap text-ink">{lesson.goals}</dd>
              </div>
            )}
            {lesson.notes && (
              <div>
                <dt className="mb-1 text-ink-muted">Observações</dt>
                <dd className="whitespace-pre-wrap text-ink">{lesson.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        {report && (
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Seu desempenho</h2>
            <dl className="space-y-3">
              {(['technique_score', 'theory_score', 'repertoire_score', 'practice_score'] as const).map((key) => {
                const score = report[key]
                if (!score) return null
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-ink-muted">{SCORE_LABELS[key]}</dt>
                    <dd className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`h-3 w-3 rounded-full ${n <= score ? 'bg-brand-600' : 'bg-hairline'}`}
                        />
                      ))}
                    </dd>
                  </div>
                )
              })}
              {report.current_song && (
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-muted">Música</dt>
                  <dd className="font-medium">{report.current_song}</dd>
                </div>
              )}
              {report.initial_bpm && report.reached_bpm && (
                <div className="flex justify-between text-sm">
                  <dt className="text-ink-muted">BPM</dt>
                  <dd className="font-medium">{report.initial_bpm} → {report.reached_bpm}</dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </div>
    </>
  )
}
