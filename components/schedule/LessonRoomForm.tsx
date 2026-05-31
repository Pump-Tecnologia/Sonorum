'use client'

import { useActionState } from 'react'

import { Field, Select } from '@/components/ui/Field'
import { updateLessonRoom, type LessonActionState } from '@/lib/actions/lessons'

interface Room {
  id: string
  name: string
}

const initial: LessonActionState = { ok: false }

export function LessonRoomForm({
  lessonId,
  currentRoomId,
  rooms,
}: {
  lessonId: string
  currentRoomId: string | null
  rooms: Room[]
}) {
  const [state, action] = useActionState(updateLessonRoom, initial)

  return (
    <form action={action}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <Field label="Sala" htmlFor="roomId">
        <Select
          id="roomId"
          name="roomId"
          defaultValue={currentRoomId ?? ''}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">Sem sala</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
      </Field>
      {state.error && <p className="mt-1 text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  )
}
