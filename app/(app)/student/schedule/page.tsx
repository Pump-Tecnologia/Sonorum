import { DashHeader, DateBlock, Panel } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { IconChevronRight } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import Link from 'next/link'
import { lessonStatus } from '@/lib/constants/lessons'
import { requireCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getStudentLessonTeachers } from '@/lib/data/student-lesson-teachers'
import { studentLessonFilters } from '@/lib/queries/student-lesson-filters'
import { hourInBR } from '@/lib/timezone'

export const metadata = { title: 'Minha agenda' }

export default async function StudentSchedulePage() {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const now = new Date().toISOString()
  const filters = studentLessonFilters(now)

  const [upcomingRes, historyRes, teachers] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, status, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user.id)
      .or(filters.upcoming)
      .order('start_datetime')
      .limit(10),
    supabase
      .from('lessons')
      .select('id, title, start_datetime, status, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user.id)
      .or(filters.history)
      .neq('status', 'in_progress')
      .order('start_datetime', { ascending: false })
      .limit(20),
    getStudentLessonTeachers(supabase),
  ])

  const upcoming = upcomingRes.data ?? []
  const history = historyRes.data ?? []

  return (
    <div className={styles.page}>
      <DashHeader title="Minha agenda" />

      <div className={styles.grid}>
        <Panel id="upcoming-title" title="Próximas aulas" className={styles.span3}>
          {upcoming.length === 0 ? (
            <p className={styles.empty}>Nenhuma aula agendada.</p>
          ) : (
            <ul className={styles.rows}>
              {upcoming.map((l) => {
                const st = lessonStatus(l.status)
                const teacher = teachers.get(l.id)
                return (
                  <li key={l.id}>
                    <div className={styles.row}>
                      <DateBlock iso={l.start_datetime} />
                      <span className={styles.rowMain}>
                        <span className={styles.rowName}>{l.title}</span>
                        <span className={styles.rowMeta}>{hourInBR(l.start_datetime)}{teacher ? `, com ${teacher}` : ''}</span>
                      </span>
                      <span className={styles.rowEnd}><StatusPill tone={st.tone}>{st.label}</StatusPill></span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel id="history-title" title="Aulas anteriores" className={styles.span3}>
          {history.length === 0 ? (
            <p className={styles.empty}>Nenhuma aula anterior.</p>
          ) : (
            <ul className={styles.rows}>
              {history.map((l) => {
                const st = lessonStatus(l.status)
                const teacher = teachers.get(l.id)
                return (
                  <li key={l.id}>
                    <Link href={`/student/lessons/${l.id}`} className={styles.row}>
                      <DateBlock iso={l.start_datetime} />
                      <span className={styles.rowMain}>
                        <span className={styles.rowName}>{l.title}</span>
                        {teacher && <span className={styles.rowMeta}>Com {teacher}</span>}
                      </span>
                      <span className={styles.rowEnd}>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                        <IconChevronRight className={styles.chevron} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
