import Link from 'next/link'

import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight, IconCheck } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { DashHeader, Panel } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { lessonStatus } from '@/lib/constants/lessons'
import { toggleGoal } from '@/lib/actions/student-detail'
import { requireCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getStudentLessonTeachers } from '@/lib/data/student-lesson-teachers'
import { studentLessonFilters } from '@/lib/queries/student-lesson-filters'
import { hourInBR, longDateInBR } from '@/lib/timezone'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Início' }

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export default async function StudentDashboard() {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const now = new Date().toISOString()
  const filters = studentLessonFilters(now)

  const [nextRes, lastRes, goalsRes, teachers] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, status, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user.id)
      .or(filters.upcoming)
      .order('start_datetime')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, start_datetime, status, notes, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user.id)
      .or(filters.history)
      .neq('status', 'canceled')
      .neq('status', 'in_progress')
      .order('start_datetime', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('student_goals')
      .select('id, text, completed')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
    getStudentLessonTeachers(supabase),
  ])

  const nextLesson = nextRes.data
  const lastLesson = lastRes.data
  const goals = goalsRes.data ?? []

  const firstName = (user?.name ?? '').split(' ')[0]
  const doneGoals = goals.filter((g) => g.completed).length
  const nextTeacher = nextLesson ? teachers.get(nextLesson.id) : null
  const nextStatus = nextLesson ? lessonStatus(nextLesson.status) : null
  const lastStatus = lastLesson ? lessonStatus(lastLesson.status) : null

  return (
    <div className={styles.page}>
      <DashHeader
        kicker={longDateInBR(new Date())}
        title={firstName ? `Olá, ${firstName}` : 'Olá'}
        actions={<LinkButton href="/student/schedule" variant="soft">Minha agenda</LinkButton>}
      />

      {nextLesson ? (
        <section className={cn(styles.panel, styles.next)} aria-labelledby="next-lesson">
          <div>
            <p className={styles.nextWhen}>Próxima aula</p>
            <h2 id="next-lesson" className={styles.nextName}>
              {capitalize(longDateInBR(new Date(nextLesson.start_datetime)))} às {hourInBR(nextLesson.start_datetime)}
            </h2>
            <p className={styles.nextMeta}>
              {nextLesson.title}{nextTeacher ? `, com ${nextTeacher}` : ''}
            </p>
          </div>
          {nextStatus && <StatusPill tone={nextStatus.tone}>{nextStatus.label}</StatusPill>}
        </section>
      ) : (
        <section className={cn(styles.panel, styles.next)} aria-label="Próxima aula">
          <p className={styles.empty}>Nenhuma aula agendada.</p>
        </section>
      )}

      <div className={styles.grid}>
        <Panel
          id="last-title"
          title="Última aula"
          link={lastLesson ? { href: `/student/lessons/${lastLesson.id}`, label: 'Ver aula' } : undefined}
        >
          {lastLesson ? (
            <>
              <div className={styles.barHead}>
                <span>{lastLesson.title}</span>
                {lastStatus && <StatusPill tone={lastStatus.tone}>{lastStatus.label}</StatusPill>}
              </div>
              <p className={styles.kicker}>{longDateInBR(new Date(lastLesson.start_datetime))}</p>
              {lastLesson.notes && <p className={styles.lastNote}>{lastLesson.notes}</p>}
            </>
          ) : (
            <p className={styles.empty}>Nenhuma aula ainda.</p>
          )}
        </Panel>

        <Panel
          id="goals-title"
          title="Minhas metas"
          className={styles.span2}
          badge={goals.length > 0 ? <StatusPill tone={doneGoals === goals.length ? 'success' : 'brand'}>{doneGoals} de {goals.length}</StatusPill> : undefined}
        >
          {goals.length === 0 ? (
            <p className={styles.empty}>Seu professor ainda não registrou metas.</p>
          ) : (
            <ul className={styles.goals}>
              {goals.map((g) => (
                <li key={g.id} className={styles.goal}>
                  <form action={toggleGoal}>
                    <input type="hidden" name="goalId" value={g.id} />
                    <input type="hidden" name="studentId" value={user.id} />
                    <input type="hidden" name="completed" value={String(g.completed)} />
                    <button
                      type="submit"
                      aria-pressed={g.completed}
                      aria-label={g.completed ? `Desmarcar: ${g.text}` : `Concluir: ${g.text}`}
                      className={styles.check}
                    >
                      <IconCheck />
                    </button>
                  </form>
                  <span className={cn(styles.goalText, g.completed && styles.goalDone)}>{g.text}</span>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.statHint}>
            <Link href="/student/progress" className={styles.panelLink}>Ver meu progresso <IconArrowRight /></Link>
          </p>
        </Panel>
      </div>
    </div>
  )
}
