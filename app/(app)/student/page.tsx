import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { lessonStatus } from '@/lib/constants/lessons'
import { toggleGoal } from '@/lib/actions/student-detail'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

export default async function StudentDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [nextRes, lastRes, goalsRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user!.id)
      .gte('start_datetime', now)
      .neq('status', 'canceled')
      .order('start_datetime')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, start_datetime, status, notes, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user!.id)
      .lt('start_datetime', now)
      .neq('status', 'canceled')
      .order('start_datetime', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('student_goals')
      .select('id, text, completed')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const nextLesson = nextRes.data
  const lastLesson = lastRes.data
  const goals = goalsRes.data ?? []
  type TeacherRow = { name: string }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Olá, ${user?.name ?? ''}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próxima aula */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-ink">Próxima aula</h2>
          {nextLesson ? (
            <div>
              <p className="text-sm font-medium text-ink">{nextLesson.title}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {new Date(nextLesson.start_datetime).toLocaleString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {(nextLesson.users as TeacherRow | null)?.name && (
                <p className="mt-1 text-sm text-ink-muted">
                  Professor: {(nextLesson.users as TeacherRow).name}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Nenhuma aula agendada.</p>
          )}
        </Card>

        {/* Última aula */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-ink">Última aula</h2>
          {lastLesson ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{lastLesson.title}</p>
                <Badge tone={lessonStatus(lastLesson.status).tone}>{lessonStatus(lastLesson.status).label}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {new Date(lastLesson.start_datetime).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long',
                })}
              </p>
              {lastLesson.notes && (
                <p className="mt-2 text-sm text-ink">{lastLesson.notes}</p>
              )}
              <Link href={`/student/lessons/${lastLesson.id}`} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">
                Ver detalhes →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Nenhuma aula ainda.</p>
          )}
        </Card>

        {/* Metas */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Minhas metas</h2>
            <span className="text-sm text-ink-muted">
              {goals.filter((g) => g.completed).length}/{goals.length} concluídas
            </span>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma meta registrada pelo professor ainda.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="flex items-center gap-3 text-sm">
                  <form action={toggleGoal}>
                    <input type="hidden" name="goalId" value={g.id} />
                    <input type="hidden" name="studentId" value={user!.id} />
                    <input type="hidden" name="completed" value={String(g.completed)} />
                    <button
                      type="submit"
                      aria-label={g.completed ? 'Marcar como pendente' : 'Concluir meta'}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-colors ${g.completed ? 'border-accent-500 bg-accent-500 text-white' : 'border-hairline hover:border-brand-400'}`}
                    >
                      {g.completed ? '✓' : ''}
                    </button>
                  </form>
                  <span className={g.completed ? 'text-ink-muted line-through' : 'text-ink'}>{g.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
