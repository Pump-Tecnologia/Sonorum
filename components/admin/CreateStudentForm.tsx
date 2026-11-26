'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { CreatePersonResult } from '@/components/admin/CreatePersonResult'
import { InfoButton } from '@/components/ds/InfoButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { InstrumentFields } from '@/components/ui/InstrumentFields'
import { createStudent, type StudentActionState } from '@/lib/actions/students'

const initial: StudentActionState = { ok: false }

export function CreateStudentForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createStudent, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok && state.createdEmail) {
    return (
      <CreatePersonResult
        roleLabel="Aluno"
        email={state.createdEmail}
        backHref="/admin/students"
        backLabel="Voltar para alunos"
      />
    )
  }

  return (
    <Card className="max-w-3xl">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name" error={fe.name}>
            <Input id="name" name="name" required />
          </Field>
          <Field label="E-mail" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={fe.phone}>
            <Input id="phone" name="phone" />
          </Field>
          <Field label="Contato do responsável" htmlFor="parentContact" error={fe.parentContact}>
            <Input id="parentContact" name="parentContact" />
          </Field>
          <InstrumentFields categoryError={fe.instrumentCategory} instrumentError={fe.instrument} />
          <Field label="Professor fixo (opcional)" htmlFor="defaultTeacherId" error={fe.defaultTeacherId} hint="Sugerido ao agendar aulas">
            <Select id="defaultTeacherId" name="defaultTeacherId" defaultValue="">
              <option value="">Nenhum</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status" error={fe.status}>
            <Select id="status" name="status" defaultValue="active">
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="inactive">Inativo</option>
            </Select>
          </Field>
          <Field label="Notificar quem" htmlFor="notifyTo" error={fe.notifyTo} hint="Aulas, cobranças e relatórios">
            <Select id="notifyTo" name="notifyTo" defaultValue="both">
              <option value="student">Aluno</option>
              <option value="parent">Responsável</option>
              <option value="both">Aluno e responsável</option>
            </Select>
          </Field>
        </div>

        <div className="sn-check-wrap">
          <label className="sn-checkrow">
            <input type="checkbox" name="notifyEmail" />
            Receber notificações por e-mail
          </label>
          <InfoButton label="Sobre as notificações" align="end">
            Aulas, cobranças e relatórios chegam no e-mail do aluno. No Premium, as mensagens vão pelo WhatsApp oficial.
          </InfoButton>
        </div>

        <Field
          label="Objetivos"
          htmlFor="objectives"
          error={fe.objectives}
          hint="Uma por linha. Cada linha vira uma meta do aluno."
        >
          <Textarea id="objectives" name="objectives" rows={4} />
        </Field>

        <SubmitButton className="w-full" pendingLabel="Criando…">Criar aluno</SubmitButton>
      </form>
    </Card>
  )
}
