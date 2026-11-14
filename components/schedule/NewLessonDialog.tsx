'use client'

import { useActionState, useEffect, useState } from 'react'

import { Button, SubmitButton } from '@/components/ds/Button'
import { Dialog, DialogFooter } from '@/components/ds/Dialog'
import { Field, FieldRow, FormAlert, Input, Select, Textarea } from '@/components/ds/Field'
import dsStyles from '@/components/ds/ds.module.css'
import { RECURRENCE_PRESETS } from '@/lib/constants/recurrence'
import { createLesson, type LessonActionState } from '@/lib/actions/lessons'

export interface Person { id: string; name: string }

const INITIAL: LessonActionState = { ok: false }

// Duração padrão de uma aula. Ao escolher o início, o fim é preenchido sozinho.
const DEFAULT_LESSON_HOURS = 1

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Recebe "YYYY-MM-DDTHH:mm" (datetime-local) e devolve +N horas no mesmo formato.
function addHours(value: string, hours: number): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  d.setHours(d.getHours() + hours)
  return toLocalInput(d)
}

interface NewLessonDialogProps {
  open: boolean
  range?: { start: string; end: string }
  students: Person[]
  teachers: Person[]
  rooms: Person[]
  role: string
  userId: string
  onClose: () => void
  onCreated: () => void
}

/**
 * Janela de criar aula. O pai remonta este componente (key) a cada abertura,
 * então o rascunho sempre começa limpo, semeado com o intervalo escolhido.
 */
export function NewLessonDialog({ open, range, students, teachers, rooms, role, userId, onClose, onCreated }: NewLessonDialogProps) {
  const initialStart = range?.start?.slice(0, 16) ?? ''
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(range?.end?.slice(0, 16) || addHours(initialStart, DEFAULT_LESSON_HOURS))
  const [draft, setDraft] = useState({ studentId: '', teacherId: '', roomId: '', title: 'Aula', notes: '', recurrence: 'none' })
  const [state, action] = useActionState(createLesson, INITIAL)

  useEffect(() => {
    if (state.ok) onCreated()
  }, [state, onCreated])

  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { value } = event.target
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova aula" subtitle="Marque uma vez e, se quiser, repita toda semana.">
      {state.error && <FormAlert>{state.error}</FormAlert>}

      {/* O React limpa o form depois de cada action, inclusive com erro de
          validação. O rascunho fica no estado para não se perder. */}
      <form action={action} onReset={(event) => event.preventDefault()} className={dsStyles.form}>
        <Field label="Aluno" htmlFor="studentId" error={state.fieldErrors?.studentId}>
          <Select id="studentId" name="studentId" required value={draft.studentId} onChange={set('studentId')} invalid={!!state.fieldErrors?.studentId}>
            <option value="" disabled>Selecione…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>

        {role === 'admin' && (
          <Field
            label="Professor"
            htmlFor="teacherId"
            error={state.fieldErrors?.teacherId}
            hint={teachers.length === 0 ? 'Cadastre um professor antes de criar aulas.' : undefined}
          >
            <Select id="teacherId" name="teacherId" required value={draft.teacherId} onChange={set('teacherId')} invalid={!!state.fieldErrors?.teacherId}>
              <option value="" disabled>Selecione…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        )}
        {role === 'teacher' && <input type="hidden" name="teacherId" value={userId} />}

        <FieldRow>
          <Field label="Título" htmlFor="title" error={state.fieldErrors?.title}>
            <Input id="title" name="title" required value={draft.title} onChange={set('title')} invalid={!!state.fieldErrors?.title} />
          </Field>
          {rooms.length > 0 && (
            <Field label="Sala" htmlFor="roomId">
              <Select id="roomId" name="roomId" value={draft.roomId} onChange={set('roomId')}>
                <option value="">Sem sala</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
          )}
        </FieldRow>

        <FieldRow>
          <Field label="Início" htmlFor="startDatetime" error={state.fieldErrors?.startDatetime}>
            <Input
              id="startDatetime"
              name="startDatetime"
              type="datetime-local"
              required
              value={start}
              onChange={(event) => {
                setStart(event.target.value)
                setEnd(addHours(event.target.value, DEFAULT_LESSON_HOURS))
              }}
            />
          </Field>
          <Field label="Fim" htmlFor="endDatetime" error={state.fieldErrors?.endDatetime}>
            <Input id="endDatetime" name="endDatetime" type="datetime-local" required value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </FieldRow>

        <Field label="Repetir" htmlFor="recurrence">
          <Select id="recurrence" name="recurrence" value={draft.recurrence} onChange={set('recurrence')}>
            {(Object.entries(RECURRENCE_PRESETS) as Array<[string, { label: string }]>).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Observações" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} value={draft.notes} onChange={set('notes')} placeholder="Opcional" />
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <SubmitButton pendingLabel="Criando…">Criar aula</SubmitButton>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
