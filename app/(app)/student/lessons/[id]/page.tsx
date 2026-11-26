import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DashHeader, Panel } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { IconArrowLeft } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { lessonStatus } from '@/lib/constants/lessons'
import { requireCurrentUser } from '@/lib/auth/session'
import { getStudentLessonTeachers } from '@/lib/data/student-lesson-teachers'
import { createClient } from '@/lib/supabase/server'
import { hourInBR, longDateInBR } from '@/lib/timezone'

export const metadata = { title: 'Aula' }

const SCORES = [
  { key: 'technique_score', label: 'Técnica' },
  { key: 'theory_score', label: 'Teoria' },
  { key: 'repertoire_score', label: 'Repertório' },
  { key: 'practice_score', label: 'Dedicação' },
] as const
const SCALE = [1, 2, 3, 4, 5]

export default async function StudentLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireCurrentUser()
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, status, notes, goals, users!lessons_teacher_id_fkey(name), room:rooms(name)')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (!lesson) notFound()

  const { data: report } = await supabase
    .from('lesson_reports')
    .select('technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm')
    .eq('lesson_id', id)
    .maybeSingle()

  const teachers = await getStudentLessonTeachers(supabase)
  const teacher = { name: teachers.get(id) }
  const room = lesson.room as { name: string } | null

  const st = lessonStatus(lesson.status)

  return (
    <div className={styles.page}>
      <Link href="/student/schedule" className={styles.back}><IconArrowLeft /> Minha agenda</Link>
      <DashHeader
        kicker={`${longDateInBR(new Date(lesson.start_datetime))}, ${hourInBR(lesson.start_datetime)}`}
        title={lesson.title}
      />

      <div className={styles.grid}>
        <Panel id="details-title" title="Aula" badge={<StatusPill tone={st.tone}>{st.label}</StatusPill>}>
          <dl className={styles.facts}>
            {teacher.name && <div><dt>Professor</dt><dd>{teacher.name}</dd></div>}
            {room?.name && <div><dt>Sala</dt><dd>{room.name}</dd></div>}
            {lesson.goals && <div><dt>Objetivos</dt><dd className={styles.pre}>{lesson.goals}</dd></div>}
            {lesson.notes && <div><dt>Recado do professor</dt><dd className={styles.pre}>{lesson.notes}</dd></div>}
          </dl>
        </Panel>

        {report && (
          <Panel id="report-title" title="Seu desempenho" className={styles.span2}>
            <dl className={styles.facts}>
              {SCORES.map(({ key, label }) => {
                const score = report[key]
                if (!score) return null
                return (
                  <div key={key} className={styles.scoreFact}>
                    <dt>{label}</dt>
                    <dd className={styles.scoreDots} aria-label={`${score} de 5`}>
                      {SCALE.map((n) => <span key={n} data-on={n <= score || undefined} aria-hidden="true" />)}
                    </dd>
                  </div>
                )
              })}
              {report.current_song && <div><dt>Música</dt><dd>{report.current_song}</dd></div>}
              {report.initial_bpm && report.reached_bpm && (
                <div><dt>Andamento</dt><dd>De {report.initial_bpm} para {report.reached_bpm} BPM</dd></div>
              )}
            </dl>
          </Panel>
        )}
      </div>
    </div>
  )
}
