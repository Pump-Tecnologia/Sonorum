'use client'

import { useActionState, useEffect } from 'react'

import { Field, Input, Select } from '@/components/ui/Field'
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

  // Feedback de sucesso some sozinho após 2s (UX: confirma a mudança).
  useEffect(() => {
    if (!state.ok) return
    const t = setTimeout(() => { /* sem cleanup necessário */ }, 0)
    return () => clearTimeout(t)
  }, [state.ok])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lessonId" value={lessonId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Início" htmlFor="startDatetime" error={state.fieldErrors?.startDatetime}>
          <Input
            id="startDatetime"
            name="startDatetime"
            type="datetime-local"
            defaultValue={toLocalInput(startDatetime)}
          />
        </Field>
        <Field label="Fim" htmlFor="endDatetime" error={state.fieldErrors?.endDatetime}>
          <Input
            id="endDatetime"
            name="endDatetime"
            type="datetime-local"
            defaultValue={toLocalInput(endDatetime)}
          />
        </Field>
      </div>

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

      {isInSeries && (
        // Aula faz parte de uma série semanal — usuário escolhe se a edição
        // vale só pra esta ocorrência ou propaga pras futuras.
        <fieldset className="rounded-lg border border-hairline bg-surface-muted/40 p-3">
          <legend className="px-1 text-xs font-semibold text-ink-muted">Aplicar a</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="apply" value="this" defaultChecked />
            Esta aula
          </label>
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="apply" value="future" />
            Esta aula e as próximas da série
          </label>
        </fieldset>
      )}

      <div className="flex items-center justify-between">
        {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
        {state.ok && <p className="text-xs font-medium text-accent-700">Atualizado!</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar horário'}
        </button>
      </div>
    </form>
  )
}
