'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { CreatePersonResult } from '@/components/admin/CreatePersonResult'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { MultiInstrumentField } from '@/components/ui/InstrumentFields'
import { createTeacher, type TeacherActionState } from '@/lib/actions/teachers'

const initial: TeacherActionState = { ok: false }

export function CreateTeacherForm() {
  const [state, action] = useActionState(createTeacher, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok && state.createdEmail) {
    return (
      <CreatePersonResult
        roleLabel="Professor"
        email={state.createdEmail}
        backHref="/admin/teachers"
        backLabel="Voltar para professores"
      />
    )
  }

  return (
    <Card className="max-w-xl">
      <form
        action={action}
        onReset={(event) => event.preventDefault()}
        className="space-y-5"
      >
        {state.error && (
          <p className="sn-alert" role="alert">
            {state.error}
          </p>
        )}

        <Field label="Nome" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" required />
        </Field>

        <Field label="E-mail" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" required />
        </Field>

        <MultiInstrumentField name="instruments" label="Instrumentos" />
        {fe.instruments && <p className="sn-error" role="alert">{fe.instruments}</p>}

        <SubmitButton pendingLabel="Criando…">Criar professor</SubmitButton>
      </form>
    </Card>
  )
}
