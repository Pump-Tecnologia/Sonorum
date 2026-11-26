'use client'

import { useActionState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { InfoButton } from '@/components/ds/InfoButton'
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
      <div className="mb-4 flex items-center gap-1">
        <h2 className="sn-card-title">Salas</h2>
        <InfoButton label="Sobre as salas" align="end">
          As salas aparecem ao agendar uma aula. Uma sala não pode ter duas aulas no mesmo horário.
        </InfoButton>
      </div>

      {rooms.length === 0 ? (
        <p className="mb-4 text-sm text-(--sn-text-muted)">Nenhuma sala cadastrada.</p>
      ) : (
        <ul className="mb-4 flex flex-col pl-0">
          {rooms.map((r) => (
            <li key={r.id} className="flex min-h-12 list-none items-center justify-between gap-3 py-1.5 text-[15px] text-(--sn-ink) not-first:shadow-[inset_0_1px_0_var(--sn-hairline)]">
              <span className="font-medium">{r.name}</span>
              <DeleteButton
                action={deleteRoom}
                hidden={{ roomId: r.id }}
                label="Excluir"
                confirmText={`Excluir a sala "${r.name}"? As aulas vinculadas ficam sem sala.`}
              />
            </li>
          ))}
        </ul>
      )}

      <form
        action={action}
        onReset={(event) => {
          if (!state.ok) event.preventDefault()
        }}
        className="space-y-3 pt-4 shadow-[inset_0_1px_0_var(--sn-hairline)]"
      >
        {state.error && <p className="sn-alert" role="alert">{state.error}</p>}
        {state.ok && <p className="sn-notice-ok" role="status">Sala criada</p>}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Field label="Nova sala" htmlFor="name" error={fe.name}>
              <Input id="name" name="name" placeholder="Sala 1, Estúdio" required />
            </Field>
          </div>
          <SubmitButton fullWidth={false} pendingLabel="Criando…">Adicionar</SubmitButton>
        </div>
      </form>
    </Card>
  )
}
