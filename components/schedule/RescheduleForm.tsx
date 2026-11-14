'use client'

import { useActionState, useEffect, useState } from 'react'

import { Button, SubmitButton } from '@/components/ds/Button'
import { DialogFooter } from '@/components/ds/Dialog'
import { Field, FieldRow, FormAlert, Input, Select } from '@/components/ds/Field'
import styles from '@/components/schedule/schedule.module.css'
import { updateLessonSchedule, type LessonActionState } from '@/lib/actions/lessons'

const TZ = 'America/Sao_Paulo'
const MINUTES_PER_DAY = 24 * 60
const initial: LessonActionState = { ok: false }

type Scope = 'this' | 'future'

export interface RescheduleTarget {
  id: string
  start: string
  end: string
  roomId: string
  inSeries: boolean
}

interface RescheduleFormProps {
  lesson: RescheduleTarget
  rooms: ReadonlyArray<{ id: string; name: string }>
  /** Horário sugerido ao arrastar a aula na agenda (ISO). */
  proposal?: { start: string; end: string }
  onBack: () => void
  onSaved: () => void
}

// Data e hora no fuso de Brasília, nos formatos dos inputs date/time.
function brParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const fromMinutes = (total: number) => {
  const clamped = Math.min(Math.max(total, 0), MINUTES_PER_DAY - 1)
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/**
 * Remarca uma aula sem sair da agenda: data, horário, sala e, se a aula for de
 * uma série semanal, se vale só para ela ou também para as próximas.
 */
export function RescheduleForm({ lesson, rooms, proposal, onBack, onSaved }: RescheduleFormProps) {
  const [state, action] = useActionState(updateLessonSchedule, initial)
  const source = proposal ?? { start: lesson.start, end: lesson.end }
  const from = brParts(source.start)
  const to = brParts(source.end)

  const [date, setDate] = useState(from.date)
  const [start, setStart] = useState(from.time)
  const [end, setEnd] = useState(to.time)
  const [scope, setScope] = useState<Scope>('this')

  useEffect(() => {
    if (state.ok) onSaved()
  }, [state.ok, onSaved])

  // Mudar o início mantém a duração da aula.
  function changeStart(value: string) {
    if (!value) return setStart(value)
    const duration = toMinutes(end) - toMinutes(start)
    setStart(value)
    if (duration > 0) setEnd(fromMinutes(toMinutes(value) + duration))
  }

  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} onReset={(event) => event.preventDefault()} className={styles.rescheduleForm}>
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="startDatetime" value={date && start ? `${date}T${start}` : ''} />
      <input type="hidden" name="endDatetime" value={date && end ? `${date}T${end}` : ''} />
      <input type="hidden" name="apply" value={lesson.inSeries ? scope : 'this'} />

      {state.error && <FormAlert>{state.error}</FormAlert>}

      <Field label="Data" htmlFor="rescheduleDate">
        <Input id="rescheduleDate" type="date" required autoFocus value={date} onChange={(event) => setDate(event.target.value)} />
      </Field>
      <FieldRow>
        <Field label="Início" htmlFor="rescheduleStart">
          <Input id="rescheduleStart" type="time" required step={300} value={start} onChange={(event) => changeStart(event.target.value)} />
        </Field>
        <Field label="Fim" htmlFor="rescheduleEnd" error={fe.endDatetime}>
          <Input id="rescheduleEnd" type="time" required step={300} value={end} onChange={(event) => setEnd(event.target.value)} invalid={!!fe.endDatetime} />
        </Field>
      </FieldRow>

      {rooms.length > 0 && (
        <Field label="Sala" htmlFor="rescheduleRoom" error={fe.roomId}>
          <Select id="rescheduleRoom" name="roomId" defaultValue={lesson.roomId} invalid={!!fe.roomId}>
            <option value="">Sem sala</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </Select>
        </Field>
      )}

      {lesson.inSeries && (
        <fieldset className={styles.scope}>
          <legend className={styles.scopeLegend}>Essa aula se repete toda semana. Mudar:</legend>
          <label className={styles.scopeOption}>
            <input type="radio" name="scopeChoice" value="this" checked={scope === 'this'} onChange={() => setScope('this')} />
            <span>Só esta aula</span>
          </label>
          <label className={styles.scopeOption}>
            <input type="radio" name="scopeChoice" value="future" checked={scope === 'future'} onChange={() => setScope('future')} />
            <span>Esta e as próximas</span>
          </label>
        </fieldset>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <SubmitButton pendingLabel="Salvando…">Salvar novo horário</SubmitButton>
      </DialogFooter>
    </form>
  )
}
