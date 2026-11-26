'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ds/Button'
import { Field, FieldRow, Input, Select } from '@/components/ds/Field'
import dsStyles from '@/components/ds/ds.module.css'
import styles from '@/components/schedule/planner.module.css'
import { updateLessonSchedule, type LessonActionState } from '@/lib/actions/lessons'

interface Person {
  id: string
  name: string
}

const initial: LessonActionState = { ok: false }

// Converte timestamptz do banco (com fuso) → string aceita por `<input type='datetime-local'>`
// no fuso BRT. Não dá pra usar toISOString() (vira UTC) — calculamos a string manualmente.
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  // Mostra em BRT (-03:00). offset = 180 min.
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function LessonScheduleForm({
  lessonId,
  startDatetime,
  endDatetime,
  currentRoomId,
  currentTeacherId,
  rooms,
  teachers,
  canEditTeacher,
  isInSeries,
}: {
  lessonId: string
  startDatetime: string
  endDatetime: string
  currentRoomId: string | null
  currentTeacherId: string | null
  rooms: Person[]
  teachers: Person[]
  canEditTeacher: boolean
  isInSeries: boolean
}) {
  const [state, action, pending] = useActionState(updateLessonSchedule, initial)

  return (
    <form
      action={action}
      // React resets action forms after submission. Keep the user's current
      // selections: resetting to the previous props can undo a saved room or
      // teacher when the user submits again.
      onReset={(event) => event.preventDefault()}
      className={dsStyles.form}
    >
      <input type="hidden" name="lessonId" value={lessonId} />

      <FieldRow>
        <Field label="Início" htmlFor="startDatetime" error={state.fieldErrors?.startDatetime}>
          <Input id="startDatetime" name="startDatetime" type="datetime-local" defaultValue={toLocalInput(startDatetime)} />
        </Field>
        <Field label="Fim" htmlFor="endDatetime" error={state.fieldErrors?.endDatetime}>
          <Input id="endDatetime" name="endDatetime" type="datetime-local" defaultValue={toLocalInput(endDatetime)} />
        </Field>
      </FieldRow>

      {(rooms.length > 0 || (canEditTeacher && teachers.length > 0)) && (
        <FieldRow>
          {rooms.length > 0 && (
            <Field label="Sala" htmlFor="roomId" error={state.fieldErrors?.roomId}>
              <Select id="roomId" name="roomId" defaultValue={currentRoomId ?? ''}>
                <option value="">Sem sala</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
          )}
          {canEditTeacher && teachers.length > 0 && (
            <Field label="Professor" htmlFor="teacherId" error={state.fieldErrors?.teacherId}>
              <Select id="teacherId" name="teacherId" defaultValue={currentTeacherId ?? ''}>
                <option value="">Sem professor</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          )}
        </FieldRow>
      )}

      {isInSeries && (
        // Aula faz parte de uma série semanal — usuário escolhe se a edição
        // vale só pra esta ocorrência ou propaga pras futuras.
        <fieldset className={styles.choice}>
          <legend>Aplicar a</legend>
          <div className={styles.choicePills}>
            <label className={styles.choicePill}>
              <input type="radio" name="apply" value="this" defaultChecked />
              <span>Só esta aula</span>
            </label>
            <label className={styles.choicePill}>
              <input type="radio" name="apply" value="future" />
              <span>Esta e as próximas</span>
            </label>
          </div>
        </fieldset>
      )}

      <div className={styles.formFoot}>
        {state.error && !pending && <p className={styles.bad} role="alert">{state.error}</p>}
        {state.ok && !pending && <p className={styles.ok} role="status">Horário salvo</p>}
        <Button type="submit" variant="soft" disabled={pending}>{pending ? 'Salvando…' : 'Salvar horário'}</Button>
      </div>
    </form>
  )
}
