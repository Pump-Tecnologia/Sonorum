'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { updateTeacher, type UpdateActionState } from '@/lib/actions/update-user'

interface TeacherData {
  id: string // teachers.id
  userId: string
  name: string
  email: string
  instruments: string[] | null
}

const initial: UpdateActionState = { ok: false }

export function EditTeacherForm({ teacher }: { teacher: TeacherData }) {
  const [state, action] = useActionState(updateTeacher, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card className="max-w-xl">
      <form
        action={action}
        onReset={(event) => event.preventDefault()}
        className="space-y-5"
      >
        <input type="hidden" name="teacherId" value={teacher.id} />

        {state.error && (
          <p className="sn-alert" role="alert">
            {state.error}
          </p>
        )}

        <Field label="Nome" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" defaultValue={teacher.name} required />
        </Field>

        <Field label="E-mail" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" defaultValue={teacher.email} required />
        </Field>

        <Field label="Instrumentos" htmlFor="instruments" error={fe.instruments} hint="Separe por vírgula">
          <Input id="instruments" name="instruments" defaultValue={(teacher.instruments ?? []).join(', ')} />
        </Field>

        <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>
      </form>
    </Card>
  )
}
