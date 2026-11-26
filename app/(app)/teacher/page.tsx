import { Avatar } from '@/components/ds/Avatar'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight } from '@/components/ds/icons'
import { Bar, DashHeader, LessonRow, Panel, StatTile } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { requireCurrentUser } from '@/lib/auth/session'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import { dayRange } from '@/lib/format'
import { greetingInBR, hourInBR, longDateInBR } from '@/lib/timezone'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Início' }

const NEXT_SOON_MINUTES = 360

function instrumentLabel(instrument: unknown): string {
  if (Array.isArray(instrument)) return instrument.join(', ')
  return typeof instrument === 'string' ? instrument : ''
}

export default async function TeacherDashboard() {
  const user = await requireCurrentUser()
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
      .eq('teacher_id', user.id)
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end)
      .order('start_datetime'),
    supabase
      .from('lessons')
      .select('status, lesson_reports(id)')
      .eq('teacher_id', user.id)
      .gte('start_datetime', weekStart.toISOString())
      .lt('start_datetime', weekEnd.toISOString()),
    supabase
      .from('lessons')
      .select('status, student_id')
      .eq('teacher_id', user.id)
      .gte('start_datetime', monthStart),
  ])

  const lessons = (todayRes.data ?? []) as unknown as TodayRow[]
  const nextLesson = lessons.find((l) => new Date(l.end_datetime) > now && l.status !== 'canceled')
  const nextStudent = nextLesson?.users as { name: string; instrument: unknown } | null
  const nextStart = nextLesson ? new Date(nextLesson.start_datetime) : null
  const nextEnd = nextLesson ? new Date(nextLesson.end_datetime) : null
  const isLive = nextStart && nextEnd ? nextStart <= now && now <= nextEnd : false
  const minsTo = nextStart ? Math.round((nextStart.getTime() - now.getTime()) / 60000) : null

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

  const firstName = (user?.name ?? '').split(' ')[0]
  const when = isLive
    ? nextLesson?.status === 'in_progress' ? 'Aula em andamento' : `Agora, até ${hourInBR(nextLesson!.end_datetime)}`
    : minsTo !== null && minsTo > 0 && minsTo <= NEXT_SOON_MINUTES
      ? `Próxima aula daqui a ${minsTo} min`
      : nextLesson ? `Próxima aula às ${hourInBR(nextLesson.start_datetime)}` : ''
  const nextMeta = nextLesson
    ? `${nextLesson.title}${nextLesson.room?.name ? `, sala ${nextLesson.room.name}` : ''}`
    : ''

  return (
    <div className={styles.page}>
      <DashHeader
        kicker={longDateInBR(now)}
        title={firstName ? `${greetingInBR(now)}, ${firstName}` : greetingInBR(now)}
        actions={
          <>
            <LinkButton href="/resources" variant="soft">Recursos</LinkButton>
            <LinkButton href="/schedule">Agenda</LinkButton>
          </>
        }
      />

      {/* Próxima aula */}
      {nextLesson ? (
        <section className={cn(styles.panel, styles.next, isLive && styles.nextLive)} aria-labelledby="next-lesson">
          <div className={styles.nextWho}>
            <Avatar name={nextStudent?.name ?? 'Aluno'} tone={instrumentTone(nextStudent?.instrument)} className={styles.nextAvatar} />
            <div>
              <p className={styles.nextWhen}>{isLive && <span className={styles.pulse} aria-hidden="true" />}{when}</p>
              <h2 id="next-lesson" className={styles.nextName}>{nextStudent?.name ?? nextLesson.title}</h2>
              {nextMeta && <p className={styles.nextMeta}>{nextMeta}</p>}
              {(nextLesson.goals || nextLesson.notes) && <p className={styles.nextNote}>{nextLesson.goals || nextLesson.notes}</p>}
            </div>
          </div>
          <LinkButton href={`/lessons/${nextLesson.id}/planner${isLive ? '#aula' : ''}`} className={styles.nextCta}>
            {isLive ? 'Conduzir a aula' : 'Abrir aula'} <IconArrowRight />
          </LinkButton>
        </section>
      ) : (
        <section className={cn(styles.panel, styles.next)} aria-label="Próxima aula">
          <p className={styles.empty}>Nenhuma aula restante hoje.</p>
          <LinkButton href="/schedule" variant="soft">Ver a semana <IconArrowRight /></LinkButton>
        </section>
      )}

      <div className={styles.stats}>
        <StatTile href="/schedule" label="Aulas hoje" value={lessons.length} />
        <StatTile label="Aulas dadas no mês" value={monthDone} />
        <StatTile label="Alunos no mês" value={activeStudents} />
        <StatTile label="Presença no mês" value={attendanceRate !== null ? <>{attendanceRate}<small>%</small></> : '—'} />
      </div>

      <div className={styles.grid}>
        <Panel id="day-title" title="Agenda do dia" link={{ href: '/schedule', label: 'Agenda' }} className={styles.span2}>
          {lessons.length === 0 ? (
            <p className={styles.empty}>Nenhuma aula hoje.</p>
          ) : (
            <ul className={styles.rows}>
              {lessons.map((l) => {
                const student = l.users as { name: string; instrument: unknown } | null
                const live = new Date(l.start_datetime) <= now && now <= new Date(l.end_datetime) && l.status !== 'canceled'
                return (
                  <LessonRow
                    key={l.id}
                    href={`/lessons/${l.id}/planner${live ? '#aula' : ''}`}
                    time={hourInBR(l.start_datetime)}
                    name={student?.name ?? 'Aluno'}
                    meta={[instrumentLabel(student?.instrument), l.room?.name].filter(Boolean).join(', ')}
                    tone={instrumentTone(student?.instrument)}
                    status={l.status}
                    live={live}
                  />
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel id="week-title" title="Semana" info="Aulas dadas sobre as agendadas da semana, e relatórios preenchidos sobre as aulas dadas.">
          <ul className={styles.bars}>
            <Bar label="Aulas dadas" value={weekDone} total={weekScheduled} display={`${weekDone} de ${weekScheduled}`} />
            <Bar label="Relatórios preenchidos" value={weekReports} total={weekDone} display={`${weekReports} de ${weekDone}`} tone="mint" />
          </ul>
        </Panel>
      </div>
    </div>
  )
}
