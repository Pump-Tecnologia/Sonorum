import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { getCurrentUser } from '@/lib/auth/session'
import { dayRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

export default async function TeacherDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const today = dayRange()
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const [todayLessons, unplannedRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, status, users!lessons_student_id_fkey(name, instrument)')
      .eq('teacher_id', user!.id)
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end)
      .neq('status', 'canceled')
      .order('start_datetime'),
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', user!.id)
      .gt('start_datetime', now.toISOString())
      .lte('start_datetime', in48h.toISOString())
      .neq('status', 'canceled'),
  ])

  const lessons = todayLessons.data ?? []
  const nextLesson = lessons.find((l) => new Date(l.end_datetime) > now && l.status !== 'canceled')
  const unplannedCount = unplannedRes.count ?? 0

  type StudentRow = { name: string; instrument: unknown }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Olá, ${user?.name ?? ''}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Aulas hoje" value={lessons.length} />
        <StatCard label="Sem planejamento (48h)" value={unplannedCount} />
        <StatCard label="Próxima aula" value={
          nextLesson
            ? new Date(nextLesson.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '—'
        } />
      </div>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Aulas de hoje</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma aula hoje.</p>
        ) : (
          <ul className="space-y-3">
            {lessons.map((l) => {
              const student = l.users as StudentRow | null
              const isPast = new Date(l.end_datetime) < new Date()
              return (
                <li key={l.id} className="flex items-center justify-between gap-4 rounded-xl border border-hairline p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{student?.name ?? '—'}</p>
                    <p className="text-xs text-ink-muted">
                      {new Date(l.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(l.end_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={l.status === 'completed' ? 'success' : isPast ? 'warning' : 'neutral'}>
                      {l.status === 'completed' ? 'Realizada' : isPast ? 'Pendente' : 'Agendada'}
                    </Badge>
                    <Link href={`/lessons/${l.id}/planner`} className="text-xs font-semibold text-brand-600 hover:underline">
                      Abrir
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-hairline pt-4">
          <Link href="/schedule" className="text-sm font-semibold text-brand-600 hover:underline">
            Ver agenda completa →
          </Link>
        </div>
      </Card>
    </>
  )
}
