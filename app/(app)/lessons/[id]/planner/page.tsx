import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Avatar } from '@/components/ds/Avatar'
import { LinkButton, SubmitButton } from '@/components/ds/Button'
import { Field, Textarea } from '@/components/ds/Field'
import { IconArrowLeft, IconRepeat } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { LiveActionCard, ScheduleDisclosure, TodayPlan } from '@/components/schedule/LessonLivePhase'
import { LessonPlanEditor, type AttachedResource } from '@/components/schedule/LessonPlanEditor'
import { LessonReportForm } from '@/components/schedule/LessonReportForm'
import { LessonScheduleForm } from '@/components/schedule/LessonScheduleForm'
import { LessonTemplateBar, type TemplateOption } from '@/components/schedule/LessonTemplateBar'
import { PlannerTabs, type PlannerTab } from '@/components/schedule/PlannerTabs'
import styles from '@/components/schedule/planner.module.css'
import { updateLesson } from '@/lib/actions/lessons'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import { resolveBlueprint } from '@/lib/constants/lesson-blueprints'
import { lessonStatus } from '@/lib/constants/lessons'
import { readPlanContent } from '@/lib/lesson-plan'
import { appBaseUrl } from '@/lib/payments'
import { listActiveTeachers } from '@/lib/queries/teachers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Aula' }

const TZ = 'America/Sao_Paulo'
const DONE_STATUSES: ReadonlyArray<string> = ['completed', 'late', 'missed']

// Decide em qual fase abrir: em andamento / na janela / aguardando presença → Aula;
// já realizada/atrasada/faltou → Avaliar; resto (agendada futura) → Planejar.
function computeDefaultTab(status: string, hasStarted: boolean, isLive: boolean): string {
  if (status === 'in_progress' || isLive || (status === 'scheduled' && hasStarted)) return 'live'
  if (DONE_STATUSES.includes(status)) return 'evaluate'
  return 'plan'
}

/** "segunda-feira, 23 de novembro, 09:00 às 09:50" (como no detalhe da agenda). */
function formatWhen(start: string, end: string | null): string {
  const day = new Date(start).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
  const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time(start)}${end ? ` às ${time(end)}` : ''}`
}

/** Instrumento do aluno (jsonb pode ser string ou array) → string única. */
function firstInstrument(raw: unknown): string | null {
  if (Array.isArray(raw)) return raw[0] != null ? String(raw[0]) : null
  return typeof raw === 'string' && raw ? raw : null
}

type ResourceRef = {
  id: string
  section: string
  pedagogical_resources: { id: string; title: string; category: string; difficulty: string; instrument: string | null } | null
}

export default async function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) notFound()
  const { features } = await getPlanContext()
  const isAdmin = me.role === 'admin'

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, notes, goals, room_id, teacher_id, series_id, student_id, users!lessons_student_id_fkey(name, instrument, instrument_category, phone)')
    .eq('id', id)
    .eq('school_id', me.schoolId)
    .maybeSingle()

  if (!lesson) notFound()

  // Staff-only data is authorized by the database, never read through the
  // student-readable lessons projection. Fail closed if the migration is missing.
  const { data: privateNotes, error: privateNotesError } = await supabase.rpc('get_lesson_private_notes', { p_lesson_id: id })
  if (privateNotesError) throw new Error('Não foi possível carregar as notas privadas da aula.')

  const [{ data: plan }, { data: report }, { data: attached }, { data: rooms }, teacherList, { data: templates }] = await Promise.all([
    supabase.from('lesson_plans').select('*').eq('lesson_id', id).maybeSingle(),
    supabase.from('lesson_reports').select('*').eq('lesson_id', id).maybeSingle(),
    supabase
      .from('lesson_pedagogical_resource')
      .select('id, section, pedagogical_resources(id, title, category, difficulty, instrument)')
      .eq('lesson_id', id),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    isAdmin ? listActiveTeachers(supabase, me.schoolId) : Promise.resolve([]),
    supabase.from('lesson_plan_templates').select('id, name, instrument_category, instrument').order('name'),
  ])
  const roomList = (rooms ?? []) as { id: string; name: string }[]
  const templateList = (templates ?? []) as TemplateOption[]

  // Lista normalizada (com id do recurso) para o editor e o plano de hoje.
  const editorAttached: AttachedResource[] = ((attached ?? []) as unknown as ResourceRef[])
    .filter((r) => r.pedagogical_resources)
    .map((r) => ({
      pivotId: r.id,
      section: r.section,
      resourceId: r.pedagogical_resources!.id,
      title: r.pedagogical_resources!.title,
      category: r.pedagogical_resources!.category,
      difficulty: r.pedagogical_resources!.difficulty,
      instrument: r.pedagogical_resources!.instrument,
    }))

  const student = lesson.users as { name: string; instrument: unknown; instrument_category: string | null; phone: string | null } | null
  const studentName = student?.name ?? 'Aluno'
  const studentInstrument = firstInstrument(student?.instrument)
  const studentInstrumentCategory = student?.instrument_category ?? null
  const instrumentLabel = studentInstrument ?? studentInstrumentCategory

  // Estrutura do plano conforme a categoria do aluno + conteúdo normalizado.
  const blueprint = resolveBlueprint(studentInstrument, studentInstrumentCategory)
  const planContent = readPlanContent(plan)

  // Janela da aula vs. agora — define o "modo dar-aula".
  const now = new Date()
  const start = new Date(lesson.start_datetime)
  const end = lesson.end_datetime ? new Date(lesson.end_datetime) : null
  const isLive = start <= now && (end ? now <= end : true)
  const hasStarted = now >= start
  // Aula já começou/passou e ainda está "Agendada" → presença pendente.
  const awaitingAttendance = lesson.status === 'scheduled' && hasStarted
  const status = lessonStatus(lesson.status)

  const hasPlan = Boolean(
    lesson.goals ||
      Object.values(planContent.sections).some(Boolean) ||
      Object.values(planContent.fields).some(Boolean) ||
      planContent.planNotes ||
      editorAttached.length,
  )

  // ── Fase 1: Planejar (antes da aula) ──────────────────────────────────────
  const planTab = (
    <div className={styles.stack}>
      <LessonTemplateBar
        lessonId={lesson.id}
        templates={templateList}
        instrumentCategory={studentInstrumentCategory}
        instrument={studentInstrument}
      />
      <LessonPlanEditor
        lessonId={lesson.id}
        goals={lesson.goals ?? ''}
        blueprint={blueprint}
        content={planContent}
        attached={editorAttached}
        instrumentCategory={studentInstrumentCategory}
        instrument={studentInstrument}
      />
    </div>
  )

  // ── Fase 2: Aula (durante) ────────────────────────────────────────────────
  const liveTab = (
    <div className={styles.liveGrid}>
      <div className={styles.liveAction}>
        <LiveActionCard lessonId={lesson.id} status={lesson.status} awaitingAttendance={awaitingAttendance} isLive={isLive} />
      </div>
      <div className={styles.liveMain}>
        <TodayPlan goals={lesson.goals} blueprint={blueprint} content={planContent} attached={editorAttached} />
        <ScheduleDisclosure lessonId={lesson.id} inSeries={Boolean(lesson.series_id)}>
          <LessonScheduleForm
            lessonId={lesson.id}
            startDatetime={lesson.start_datetime}
            endDatetime={lesson.end_datetime}
            currentRoomId={lesson.room_id}
            currentTeacherId={lesson.teacher_id}
            rooms={roomList}
            teachers={teacherList}
            canEditTeacher={isAdmin}
            isInSeries={Boolean(lesson.series_id)}
          />
        </ScheduleDisclosure>
      </div>
    </div>
  )

  // ── Fase 3: Avaliar (depois da aula) ──────────────────────────────────────
  const evaluateTab = (
    <div className={styles.evalGrid}>
      <section className={styles.panel} aria-labelledby="report-title">
        <div className={styles.panelHead}>
          <h2 id="report-title" className={styles.panelTitle}>Relatório de desempenho</h2>
          {report && <StatusPill tone="success">Preenchido</StatusPill>}
        </div>
        <LessonReportForm
          lessonId={lesson.id}
          report={report}
          canSend={features.reports}
          studentName={studentName}
          studentPhone={student?.phone ?? null}
          reportUrl={`${appBaseUrl()}/relatorio/${lesson.id}`}
        />
      </section>

      <section className={styles.panel} aria-labelledby="notes-title">
        <div className={styles.panelHead}>
          <h2 id="notes-title" className={styles.panelTitle}>Recado e anotações</h2>
        </div>
        <form action={updateLesson} className={styles.notesForm}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Field label="Recado para o aluno" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={lesson.notes ?? ''} rows={4} />
          </Field>
          <Field label="Notas da equipe (o aluno não vê)" htmlFor="private_notes">
            <Textarea id="private_notes" name="private_notes" defaultValue={privateNotes ?? ''} rows={4} />
          </Field>
          <SubmitButton pendingLabel="Salvando…">Salvar anotações</SubmitButton>
        </form>
      </section>
    </div>
  )

  const tabs: PlannerTab[] = [
    {
      id: 'plan', label: 'Planejar', hash: 'planejar', done: hasPlan, content: planTab,
      hint: 'Antes da aula: defina os objetivos, escreva o plano de cada parte e anexe os recursos. As partes do plano mudam conforme o instrumento do aluno.',
    },
    {
      id: 'live', label: 'Aula', hash: 'aula', done: DONE_STATUSES.includes(lesson.status), content: liveTab,
      hint: 'Durante a aula: inicie, conduza pelo plano e, no fim, registre a presença.',
    },
    {
      id: 'evaluate', label: 'Avaliar', hash: 'avaliar', done: Boolean(report), content: evaluateTab,
      hint: 'Depois da aula: avalie o desempenho, envie o relatório e deixe um recado para o aluno.',
    },
  ]

  return (
    <article className={styles.page} aria-labelledby="lesson-student">
      <Link href="/schedule" className={styles.back}><IconArrowLeft /> Agenda</Link>

      <header className={`${styles.panel} ${styles.hero}`}>
        <div className={styles.heroWho}>
          <Avatar name={studentName} tone={instrumentTone(student?.instrument)} className={styles.heroAvatar} />
          <div>
            <p className={styles.when}>{formatWhen(lesson.start_datetime, lesson.end_datetime)}</p>
            <h1 id="lesson-student" className={styles.heroName}>{studentName}</h1>
            <div className={styles.heroMeta}>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              {instrumentLabel && <span className={styles.chip} data-tone={instrumentTone(student?.instrument)}>{instrumentLabel}</span>}
              {lesson.series_id && <span className={`${styles.chip} ${styles.chipPlain}`}><IconRepeat /> Toda semana</span>}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className={styles.heroActions}>
            <LinkButton href={`/admin/students/${lesson.student_id}`} variant="soft">Ficha do aluno</LinkButton>
          </div>
        )}
      </header>

      <PlannerTabs tabs={tabs} defaultTab={computeDefaultTab(lesson.status, hasStarted, isLive)} />
    </article>
  )
}
