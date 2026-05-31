'use client'

import { useActionState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { createRoom, deleteRoom, type RoomActionState } from '@/lib/actions/rooms'

interface Room {
  id: string
  name: string
}

const initial: RoomActionState = { ok: false }

export function RoomsManager({ rooms }: { rooms: Room[] }) {
  const [state, action] = useActionState(createRoom, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold text-ink">Salas</h2>
      <p className="mb-4 text-sm text-ink-muted">As salas aparecem ao agendar uma aula. Uma sala não pode ter duas aulas no mesmo horário.</p>

      {rooms.length === 0 ? (
        <p className="mb-4 text-sm text-ink-muted">Nenhuma sala cadastrada.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {rooms.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
              <span className="font-medium text-ink">{r.name}</span>
              <DeleteButton
                action={deleteRoom}
                hidden={{ roomId: r.id }}
                label="Excluir"
                confirmText={`Excluir a sala "${r.name}"? As aulas vinculadas ficam sem sala.`}
                className="text-xs px-2 py-0.5"
              />
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="border-t border-hairline pt-4">
        {state.error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state.ok && <p className="mb-3 rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-800">Sala criada!</p>}
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Nova sala" htmlFor="name" error={fe.name}>
            <Input id="name" name="name" placeholder="Sala 1, Estúdio…" required />
          </Field>
          <SubmitButton pendingLabel="Criando…">Adicionar</SubmitButton>
        </div>
      </form>
    </Card>
  )
}
