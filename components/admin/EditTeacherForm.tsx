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
    <Card>
      <form action={action} className="max-w-lg space-y-5">
        <input type="hidden" name="teacherId" value={teacher.id} />

        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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

        <Field
          label="Nova senha (deixe em branco para não alterar)"
          htmlFor="newPassword"
          error={fe.newPassword}
          hint="Mínimo de 8 caracteres"
        >
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
        </Field>

        <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>
      </form>
    </Card>
  )
}
