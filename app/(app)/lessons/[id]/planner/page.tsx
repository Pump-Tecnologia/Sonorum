import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { updateLesson } from '@/lib/actions/lessons'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Planejador de aula' }

const STATUS_OPTS = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'completed', label: 'Realizada' },
  { value: 'canceled', label: 'Cancelada' },
]

export default async function PlannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, notes, goals, private_notes, student_id, teacher_id, users!lessons_student_id_fkey(name, instrument)')
    .eq('id', id)
    .maybeSingle()

  if (!lesson) notFound()

  const { data: report } = await supabase
    .from('lesson_reports')
    .select('*')
    .eq('lesson_id', id)
    .maybeSingle()

  const student = lesson.users as { name: string; instrument: unknown } | null

  return (
    <>
      <PageHeader
        title={`Aula — ${student?.name ?? ''}`}
        subtitle={new Date(lesson.start_datetime).toLocaleString('pt-BR', {
          weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
        })}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações + status */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Dados da aula</h2>
          <form action={updateLesson} className="space-y-4">
            <input type="hidden" name="lessonId" value={lesson.id} />

            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={lesson.status}>
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Objetivos da aula" htmlFor="goals">
              <Textarea id="goals" name="goals" defaultValue={lesson.goals ?? ''} rows={3} />
            </Field>

            <Field label="Observações (visível ao aluno)" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={lesson.notes ?? ''} rows={3} />
            </Field>

            <Field label="Notas privadas (só você vê)" htmlFor="private_notes">
              <Textarea id="private_notes" name="private_notes" defaultValue={lesson.private_notes ?? ''} rows={2} />
            </Field>

            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Salvar
            </button>
          </form>
        </Card>

        {/* Relatório de desempenho */}
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
                    <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`${key}_score`}
                        value={n}
                        defaultChecked={report?.[`${key}_score` as keyof typeof report] === n}
                        className="sr-only"
                      />
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-sm font-semibold hover:bg-brand-50 hover:border-brand-400">
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

            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Salvar relatório
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}
