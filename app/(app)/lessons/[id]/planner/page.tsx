import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { ResourcePicker } from '@/components/schedule/ResourcePicker'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { detachResource, markAttendance, updateLesson, upsertLessonPlan } from '@/lib/actions/lessons'
import { lessonStatus } from '@/lib/constants/lessons'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Planejador de aula' }

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

export default async function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, notes, goals, private_notes, room_id, users!lessons_student_id_fkey(name, instrument)')
    .eq('id', id)
    .maybeSingle()

  if (!lesson) notFound()

  const [{ data: plan }, { data: report }, { data: attached }, { data: rooms }] = await Promise.all([
    supabase.from('lesson_plans').select('*').eq('lesson_id', id).maybeSingle(),
    supabase.from('lesson_reports').select('*').eq('lesson_id', id).maybeSingle(),
    supabase
      .from('lesson_pedagogical_resource')
      .select('id, section, pedagogical_resources(id, title, category, difficulty, instrument)')
      .eq('lesson_id', id),
    supabase.from('rooms').select('id, name').eq('active', true).order('name'),
  ])
  const roomList = (rooms ?? []) as { id: string; name: string }[]

  type ResourceRef = {
    id: string
    section: string
    pedagogical_resources: { id: string; title: string; category: string; difficulty: string; instrument: string | null } | null
  }
  const attachedList = (attached ?? []) as unknown as ResourceRef[]

  // Agrupa por seção
  const bySection = SECTION_OPTS.reduce<Record<string, ResourceRef[]>>((acc, s) => {
    acc[s] = attachedList.filter((r) => r.section === s)
    return acc
  }, {})

  const student = lesson.users as { name: string; instrument: unknown } | null

  // Janela da aula vs. agora — define o "modo dar-aula".
  const now = new Date()
  const start = new Date(lesson.start_datetime)
  const end = lesson.end_datetime ? new Date(lesson.end_datetime) : null
  const isLive = start <= now && (end ? now <= end : true)
  const hasStarted = now >= start
  // Aula já começou/passou e ainda está "Agendada" → presença pendente.
  const awaitingAttendance = lesson.status === 'scheduled' && hasStarted

  return (
    <>
      <PageHeader
        title={`Aula — ${student?.name ?? ''}`}
        subtitle={new Date(lesson.start_datetime).toLocaleString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
        })}
      />

      {/* Presença — modo dar-aula */}
      <Card className={`mb-6 ${isLive ? 'border-accent-500 bg-accent-50/40' : awaitingAttendance ? 'border-amber-300' : ''}`}>
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna 1 — Status, observações e planejamento */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Dados da aula</h2>
            <form action={updateLesson} className="space-y-4">
              <input type="hidden" name="lessonId" value={lesson.id} />

              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={lesson.status}>
                  {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>

              {roomList.length > 0 && (
                <Field label="Sala" htmlFor="room_id">
                  <Select id="room_id" name="room_id" defaultValue={lesson.room_id ?? ''}>
                    <option value="">Sem sala</option>
                    {roomList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </Field>
              )}

              <Field label="Objetivos da aula" htmlFor="goals">
                <Textarea id="goals" name="goals" defaultValue={lesson.goals ?? ''} rows={2} />
              </Field>

              <Field label="Observações (visíveis ao aluno)" htmlFor="notes">
                <Textarea id="notes" name="notes" defaultValue={lesson.notes ?? ''} rows={2} />
              </Field>

              <Field label="Notas privadas (só você vê)" htmlFor="private_notes">
                <Textarea id="private_notes" name="private_notes" defaultValue={lesson.private_notes ?? ''} rows={2} />
              </Field>

              <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Salvar
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Planejamento</h2>
            <form action={upsertLessonPlan} className="space-y-4">
              <input type="hidden" name="lessonId" value={lesson.id} />

              <Field label="Aquecimento" htmlFor="warmup">
                <Textarea id="warmup" name="warmup" defaultValue={plan?.warmup ?? ''} rows={2} />
              </Field>

              <Field label="Repertório" htmlFor="repertoire">
                <Textarea id="repertoire" name="repertoire" defaultValue={plan?.repertoire ?? ''} rows={2} />
              </Field>

              <Field label="Tarefa de casa" htmlFor="homework">
                <Textarea id="homework" name="homework" defaultValue={plan?.homework ?? ''} rows={2} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="BPM alvo" htmlFor="target_bpm">
                  <Input id="target_bpm" name="target_bpm" defaultValue={plan?.target_bpm ?? ''} />
                </Field>
              </div>

              <Field label="Outras notas" htmlFor="plan_notes">
                <Textarea id="plan_notes" name="plan_notes" defaultValue={plan?.notes ?? ''} rows={2} />
              </Field>

              <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Salvar planejamento
              </button>
            </form>
          </Card>
        </div>

        {/* Coluna 2 — Recursos e relatório */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Recursos pedagógicos</h2>

            <div className="space-y-4">
              {SECTION_OPTS.map((s) => (
                <div key={s}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {SECTION_LABEL[s]}
                  </p>
                  {bySection[s]!.length === 0 ? (
                    <p className="text-sm text-ink-muted">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {bySection[s]!.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                          <span className="text-ink">{r.pedagogical_resources?.title ?? '—'}</span>
                          <DeleteButton
                            action={detachResource}
                            hidden={{ pivotId: r.id, lessonId: lesson.id }}
                            label="Remover"
                            confirmText="Remover este recurso da aula?"
                            className="text-xs px-2 py-0.5"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-hairline pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Anexar recurso</p>
              <ResourcePicker lessonId={lesson.id} />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Relatório de desempenho</h2>
              {report && <Badge tone="success">Preenchido</Badge>}
            </div>
            <form action={updateLesson} className="space-y-4">
              <input type="hidden" name="lessonId" value={lesson.id} />

              {(['technique', 'theory', 'repertoire', 'practice'] as const).map((key) => (
                <Field
                  key={key}
                  label={{ technique: 'Técnica', theory: 'Teoria', repertoire: 'Repertório', practice: 'Dedicação' }[key]}
                  htmlFor={`${key}_score`}
                >
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`${key}_score`}
                          value={n}
                          defaultChecked={report?.[`${key}_score` as keyof typeof report] === n}
                          className="peer sr-only"
                        />
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-sm font-semibold transition-colors hover:bg-brand-50 peer-checked:border-brand-500 peer-checked:bg-brand-600 peer-checked:text-white">
                          {n}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              ))}

              <Field label="Música atual" htmlFor="current_song">
                <Input id="current_song" name="current_song" defaultValue={report?.current_song ?? ''} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="BPM inicial" htmlFor="initial_bpm">
                  <Input id="initial_bpm" name="initial_bpm" type="number" defaultValue={report?.initial_bpm ?? ''} />
                </Field>
                <Field label="BPM alcançado" htmlFor="reached_bpm">
                  <Input id="reached_bpm" name="reached_bpm" type="number" defaultValue={report?.reached_bpm ?? ''} />
                </Field>
              </div>

              <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Salvar relatório
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  )
}

const SECTION_OPTS = ['warmup', 'repertoire', 'homework', 'general'] as const
