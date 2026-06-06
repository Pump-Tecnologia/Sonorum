import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { LessonScheduleForm } from '@/components/schedule/LessonScheduleForm'
import { LessonPlanEditor, type AttachedResource } from '@/components/schedule/LessonPlanEditor'
import { LessonTemplateBar, type TemplateOption } from '@/components/schedule/LessonTemplateBar'
import { PlannerTabs, type PlannerTab } from '@/components/schedule/PlannerTabs'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { LessonReportForm } from '@/components/schedule/LessonReportForm'
import { cancelLessonSeries, markAttendance, updateLesson } from '@/lib/actions/lessons'
import { lessonStatus } from '@/lib/constants/lessons'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { appBaseUrl } from '@/lib/payments'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Aula' }

const SECTION_OPTS = ['warmup', 'repertoire', 'homework', 'general'] as const

const STATUS_OPTS = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'completed', label: 'Realizada' },
  { value: 'late', label: 'Atrasado' },
  { value: 'missed', label: 'Faltou' },
  { value: 'canceled', label: 'Cancelada' },
]

// Botões de presença rápida (modo dar-aula).
const ATTENDANCE_BTNS = [
  { value: 'completed', label: 'Presente', cls: 'bg-accent-600 text-white hover:bg-accent-700' },
  { value: 'late', label: 'Atrasado', cls: 'bg-amber-500 text-white hover:bg-amber-600' },
  { value: 'missed', label: 'Faltou', cls: 'bg-red-600 text-white hover:bg-red-700' },
] as const

const SECTION_LABEL: Record<string, string> = {
  warmup: 'Aquecimento',
  repertoire: 'Repertório',
  homework: 'Tarefa de casa',
  general: 'Geral',
}

const PRIMARY_BTN = 'rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700'

// Decide em qual fase abrir: em andamento ou aguardando presença → Dar aula;
// já realizada/atrasada/faltou → Avaliar; resto (agendada futura) → Planejar.
function computeDefaultTab(status: string, hasStarted: boolean, isLive: boolean): string {
  if (isLive || (status === 'scheduled' && hasStarted)) return 'live'
  if (['completed', 'late', 'missed'].includes(status)) return 'evaluate'
  return 'plan'
}

export default async function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const me = await getCurrentUser()
  const { features } = await getPlanContext()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, notes, goals, private_notes, room_id, teacher_id, series_id, student_id, users!lessons_student_id_fkey(name, instrument, instrument_category, phone)')
    .eq('id', id)
    .maybeSingle()

  if (!lesson) notFound()

  const [{ data: plan }, { data: report }, { data: attached }, { data: rooms }, { data: teachers }, { data: templates }] = await Promise.all([
    supabase.from('lesson_plans').select('*').eq('lesson_id', id).maybeSingle(),
    supabase.from('lesson_reports').select('*').eq('lesson_id', id).maybeSingle(),
    supabase
      .from('lesson_pedagogical_resource')
      .select('id, section, pedagogical_resources(id, title, category, difficulty, instrument)')
      .eq('lesson_id', id),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
    me?.role === 'admin'
      ? supabase.from('users').select('id, name').eq('role', 'teacher').eq('status', 'active').order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('lesson_plan_templates').select('id, name, instrument_category, instrument').order('name'),
  ])
  const roomList = (rooms ?? []) as { id: string; name: string }[]
  const teacherList = (teachers ?? []) as { id: string; name: string }[]
  const templateList = (templates ?? []) as TemplateOption[]

  type ResourceRef = {
    id: string
    section: string
    pedagogical_resources: { id: string; title: string; category: string; difficulty: string; instrument: string | null } | null
  }
  const attachedList = (attached ?? []) as unknown as ResourceRef[]

  // Lista normalizada (com id do recurso) para o editor e o checklist.
  const editorAttached: AttachedResource[] = attachedList
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

  // Agrupa por seção (usado no checklist de "Dar aula")
  const bySection = SECTION_OPTS.reduce<Record<string, AttachedResource[]>>((acc, s) => {
    acc[s] = editorAttached.filter((r) => r.section === s)
    return acc
  }, {})

  const student = lesson.users as { name: string; instrument: unknown; instrument_category: string | null; phone: string | null } | null

  // Instrumento do aluno (jsonb pode ser string ou array) → string única p/ sugerir recursos.
  const rawInstrument = student?.instrument
  const studentInstrument = Array.isArray(rawInstrument)
    ? (rawInstrument[0] != null ? String(rawInstrument[0]) : null)
    : (typeof rawInstrument === 'string' && rawInstrument ? rawInstrument : null)
  const studentInstrumentCategory = student?.instrument_category ?? null

  // Janela da aula vs. agora — define o "modo dar-aula".
  const now = new Date()
  const start = new Date(lesson.start_datetime)
  const end = lesson.end_datetime ? new Date(lesson.end_datetime) : null
  const isLive = start <= now && (end ? now <= end : true)
  const hasStarted = now >= start
  // Aula já começou/passou e ainda está "Agendada" → presença pendente.
  const awaitingAttendance = lesson.status === 'scheduled' && hasStarted

  const defaultTab = computeDefaultTab(lesson.status, hasStarted, isLive)

  // ── Fase 1: Planejar (antes da aula) ──────────────────────────────────────
  const planTab = (
    <div className="space-y-5">
      <LessonTemplateBar
        lessonId={lesson.id}
        templates={templateList}
        instrumentCategory={studentInstrumentCategory}
        instrument={studentInstrument}
      />
      <LessonPlanEditor
        lessonId={lesson.id}
        goals={lesson.goals ?? ''}
        plan={{
          warmup: plan?.warmup ?? '',
          repertoire: plan?.repertoire ?? '',
          homework: plan?.homework ?? '',
          target_bpm: plan?.target_bpm ?? '',
          notes: plan?.notes ?? '',
        }}
        attached={editorAttached}
        instrumentCategory={studentInstrumentCategory}
        instrument={studentInstrument}
      />
    </div>
  )

  // Checklist do plano (read-only) para guiar a execução durante a aula.
  const planSections = [
    { key: 'warmup', note: plan?.warmup ?? '' },
    { key: 'repertoire', note: plan?.repertoire ?? '' },
    { key: 'homework', note: plan?.homework ?? '' },
  ] as const
  const hasPlan = Boolean(
    lesson.goals || plan?.warmup || plan?.repertoire || plan?.homework || plan?.target_bpm || plan?.notes || editorAttached.length,
  )

  // ── Fase 2: Dar aula (durante) ────────────────────────────────────────────
  const liveTab = (
    <div className="space-y-6">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Plano de hoje</h2>
          <span className="text-xs text-ink-muted">do que você planejou →</span>
        </div>
        {!hasPlan ? (
          <p className="text-sm text-ink-muted">
            Nada planejado ainda. Você pode planejar na aba <strong className="text-ink">Planejar</strong>.
          </p>
        ) : (
          <div className="space-y-4">
            {lesson.goals && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Objetivos</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{lesson.goals}</p>
              </div>
            )}
            {planSections.map((s) => {
              const items = bySection[s.key]!
              if (!s.note && items.length === 0) return null
              return (
                <div key={s.key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{SECTION_LABEL[s.key]}</p>
                  {s.note && <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{s.note}</p>}
                  {items.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {items.map((r) => (
                        <li key={r.pivotId} className="flex items-center gap-2 text-sm text-ink">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                          {r.title}
                          <span className="text-xs text-ink-muted">· {r.category}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
            {bySection.general!.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{SECTION_LABEL.general}</p>
                <ul className="mt-1.5 space-y-1">
                  {bySection.general!.map((r) => (
                    <li key={r.pivotId} className="flex items-center gap-2 text-sm text-ink">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {r.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan?.target_bpm && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Meta de BPM</p>
                <p className="mt-1 text-sm font-medium text-ink">{plan.target_bpm}</p>
              </div>
            )}
            {plan?.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Notas</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{plan.notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className={isLive ? 'border-accent-500 bg-accent-50/40' : awaitingAttendance ? 'border-amber-300' : ''}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {isLive && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent-600" />
                Aula em andamento
              </span>
            )}
            <h2 className="text-base font-semibold text-ink">Presença</h2>
            <p className="text-sm text-ink-muted">
              {awaitingAttendance
                ? 'A aula já começou — registre a presença do aluno.'
                : <>Status atual: <strong className="text-ink">{lessonStatus(lesson.status).label}</strong></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_BTNS.map((b) => (
              <form key={b.value} action={markAttendance}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="status" value={b.value} />
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${b.cls} ${
                    lesson.status === b.value ? 'ring-2 ring-ink/30 ring-offset-2' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  {b.label}
                </button>
              </form>
            ))}
          </div>
        </div>

        <form action={updateLesson} className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Field label="Ajustar status manualmente" htmlFor="status">
            <Select id="status" name="status" defaultValue={lesson.status}>
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <button type="submit" className="rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted">
            Salvar status
          </button>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Horário e atribuição</h2>
          {lesson.series_id && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              parte de uma série semanal
            </span>
          )}
        </div>
        <LessonScheduleForm
          lessonId={lesson.id}
          startDatetime={lesson.start_datetime}
          endDatetime={lesson.end_datetime}
          currentRoomId={lesson.room_id}
          currentTeacherId={lesson.teacher_id}
          rooms={roomList}
          teachers={teacherList}
          canEditTeacher={me?.role === 'admin'}
          isInSeries={Boolean(lesson.series_id)}
        />
        {lesson.series_id && (
          <form action={cancelLessonSeries} className="mt-3 border-t border-hairline pt-3">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
            >
              Cancelar esta aula e todas as próximas da série
            </button>
          </form>
        )}
      </Card>
    </div>
  )

  // ── Fase 3: Avaliar (depois da aula) ──────────────────────────────────────
  const evaluateTab = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Relatório de desempenho</h2>
          {report && <Badge tone="success">Preenchido</Badge>}
        </div>
        <LessonReportForm
          lessonId={lesson.id}
          report={report}
          canSend={features.reports}
          studentName={student?.name ?? ''}
          studentPhone={student?.phone ?? null}
          reportUrl={`${appBaseUrl()}/relatorio/${lesson.id}`}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Feedback e anotações</h2>
        <form action={updateLesson} className="space-y-4">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <Field label="Observações (visíveis ao aluno)" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={lesson.notes ?? ''} rows={4} />
          </Field>
          <Field label="Notas privadas (só você vê)" htmlFor="private_notes">
            <Textarea id="private_notes" name="private_notes" defaultValue={lesson.private_notes ?? ''} rows={4} />
          </Field>
          <button type="submit" className={PRIMARY_BTN}>Salvar anotações</button>
        </form>
      </Card>
    </div>
  )

  const tabs: PlannerTab[] = [
    { id: 'plan', label: 'Planejar', hint: 'Defina objetivos, planeje o conteúdo e anexe recursos antes da aula.', content: planTab },
    { id: 'live', label: 'Dar aula', hint: 'Registre a presença e ajuste horário/sala durante ou logo após a aula.', content: liveTab },
    { id: 'evaluate', label: 'Avaliar', hint: 'Depois da aula: avalie o desempenho e deixe feedback ao aluno.', content: evaluateTab },
  ]

  return (
    <>
      <PageHeader
        title={`Aula — ${student?.name ?? ''}`}
        subtitle={new Date(lesson.start_datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
          weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
        })}
        action={
          me?.role === 'admin' ? (
            <Link
              href={`/admin/students/${lesson.student_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted"
            >
              Ver perfil do aluno →
            </Link>
          ) : undefined
        }
      />
      <PlannerTabs tabs={tabs} defaultTab={defaultTab} />
    </>
  )
}
