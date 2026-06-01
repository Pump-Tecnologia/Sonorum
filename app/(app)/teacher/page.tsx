import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { lessonStatus } from '@/lib/constants/lessons'
import { getCurrentUser } from '@/lib/auth/session'
import { dayRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

const QUICK_ACTIONS = [
  { label: 'Agenda', href: '/schedule', desc: 'Ver e criar aulas' },
  { label: 'Recursos', href: '/resources', desc: 'Materiais e partituras' },
]

function ProgressBar({ value, total, tone }: { value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function TeacherDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const today = dayRange()
  const now = new Date()

  // Semana corrente (segunda 00:00 → +7d)
  const dow = (now.getDay() + 6) % 7
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  type TodayRow = { id: string; title: string; start_datetime: string; end_datetime: string; status: string; goals: string | null; notes: string | null; users: { name: string; instrument: unknown } | null; room: { name: string } | null }
  type WeekRow = { status: string; lesson_reports: { id: string }[] | { id: string } | null }
  type MonthRow = { status: string; student_id: string }

  const [todayRes, weekRes, monthRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, status, goals, notes, users!lessons_student_id_fkey(name, instrument), room:rooms(name)')
      .eq('teacher_id', user!.id)
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end)
      .order('start_datetime'),
    supabase
      .from('lessons')
      .select('status, lesson_reports(id)')
      .eq('teacher_id', user!.id)
      .gte('start_datetime', weekStart.toISOString())
      .lt('start_datetime', weekEnd.toISOString()),
    supabase
      .from('lessons')
      .select('status, student_id')
      .eq('teacher_id', user!.id)
      .gte('start_datetime', monthStart),
  ])

  const lessons = (todayRes.data ?? []) as unknown as TodayRow[]
  const nextLesson = lessons.find((l) => new Date(l.end_datetime) > now && l.status !== 'canceled')
  const nextStudent = nextLesson?.users as { name: string; instrument: unknown } | null
  const nextStart = nextLesson ? new Date(nextLesson.start_datetime) : null
  const nextEnd = nextLesson ? new Date(nextLesson.end_datetime) : null
  const isLive = nextStart && nextEnd ? nextStart <= now && now <= nextEnd : false
  const minsTo = nextStart ? Math.round((nextStart.getTime() - now.getTime()) / 60000) : null
  const countdown = isLive ? 'Agora' : minsTo !== null && minsTo > 0 && minsTo <= 360 ? `em ${minsTo} min` : nextStart ? nextStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

  // Semana — metas
  const week = (weekRes.data ?? []) as unknown as WeekRow[]
  const weekScheduled = week.filter((l) => l.status !== 'canceled').length
  const weekDone = week.filter((l) => l.status === 'completed' || l.status === 'late').length
  const weekReports = week.filter((l) => (Array.isArray(l.lesson_reports) ? l.lesson_reports.length > 0 : Boolean(l.lesson_reports))).length

  // Mês — KPIs (sem financeiro)
  const month = (monthRes.data ?? []) as MonthRow[]
  const monthDone = month.filter((l) => l.status === 'completed' || l.status === 'late').length
  const monthMissed = month.filter((l) => l.status === 'missed').length
  const attendanceRate = monthDone + monthMissed > 0 ? Math.round((monthDone / (monthDone + monthMissed)) * 100) : null
  const activeStudents = new Set(month.map((l) => l.student_id)).size

  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${greeting}, ${user?.name ?? ''}`} />

      {/* Próxima aula — hero */}
      {nextLesson ? (
        <Card className={`mb-6 ${isLive ? 'border-accent-500 bg-accent-50/30' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                {isLive ? '● Aula em andamento' : 'Próxima aula'} · {countdown}
              </p>
              <p className="text-xl font-bold text-ink">{nextLesson.title}</p>
              <p className="text-sm text-ink-muted">
                {nextStudent?.name ?? '—'}
                {nextStart && <> · {nextStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>}
                {nextLesson.room?.name && <> · {nextLesson.room.name}</>}
              </p>
              {(nextLesson.goals || nextLesson.notes) && (
                <p className="mt-2 max-w-xl rounded-lg bg-surface-muted/60 px-3 py-2 text-sm text-ink-muted">
                  {nextLesson.goals || nextLesson.notes}
                </p>
              )}
            </div>
            <Link href={`/lessons/${nextLesson.id}/planner`}>
              <span className="inline-flex items-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                {isLive ? 'Iniciar aula' : 'Abrir planejador'} →
              </span>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="mb-6"><p className="text-sm text-ink-muted">Nenhuma aula restante hoje. 🎵</p></Card>
      )}

      {/* Ações rápidas */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nextLesson && (
          <Link href={`/lessons/${nextLesson.id}/planner`} className="rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-brand-300">
            <p className="text-sm font-semibold text-ink">Planejador</p>
            <p className="text-xs text-ink-muted">Plano e presença da aula</p>
          </Link>
        )}
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-brand-300">
            <p className="text-sm font-semibold text-ink">{a.label}</p>
            <p className="text-xs text-ink-muted">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* KPIs (sem financeiro) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aulas hoje" value={lessons.length} />
        <StatCard label="Aulas no mês" value={monthDone} />
        <StatCard label="Alunos ativos" value={activeStudents} />
        <StatCard label="Presença (mês)" value={attendanceRate !== null ? `${attendanceRate}%` : '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda do dia */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Agenda do dia</h2>
            <LinkButton href="/schedule" variant="ghost" size="sm">Ver agenda completa →</LinkButton>
          </div>
          {lessons.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula hoje.</p>
          ) : (
            <ul className="space-y-2">
              {lessons.map((l) => {
                const student = l.users as { name: string; instrument: unknown } | null
                const live = new Date(l.start_datetime) <= now && now <= new Date(l.end_datetime) && l.status !== 'canceled'
                return (
                  <li key={l.id} className={`flex items-center justify-between gap-4 rounded-xl border p-3 ${live ? 'border-accent-400 bg-accent-50/30' : 'border-hairline'}`}>
                    <div>
                      <p className="text-sm font-medium text-ink">{student?.name ?? '—'}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(l.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(l.end_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {l.room?.name && <> · {l.room.name}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={lessonStatus(l.status).tone}>{lessonStatus(l.status).label}</Badge>
                      <LinkButton href={`/lessons/${l.id}/planner`} variant="secondary" size="sm">
                        {live ? 'Iniciar' : 'Abrir'}
                      </LinkButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Metas da semana */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Metas da semana</h2>
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-ink">Aulas ministradas</span>
                <span className="font-semibold text-ink">{weekDone}/{weekScheduled}</span>
              </div>
              <ProgressBar value={weekDone} total={weekScheduled} tone="bg-brand-600" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-ink">Laudos preenchidos</span>
                <span className="font-semibold text-ink">{weekReports}/{weekDone}</span>
              </div>
              <ProgressBar value={weekReports} total={weekDone} tone="bg-accent-500" />
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
