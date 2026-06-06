'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { CreatePersonResult } from '@/components/admin/CreatePersonResult'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { InstrumentFields } from '@/components/ui/InstrumentFields'
import { createStudent, type StudentActionState } from '@/lib/actions/students'

const initial: StudentActionState = { ok: false }

export function CreateStudentForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createStudent, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok && state.tempPassword && state.createdEmail) {
    return (
      <CreatePersonResult
        roleLabel="Aluno"
        email={state.createdEmail}
        tempPassword={state.tempPassword}
        backHref="/admin/students"
        backLabel="Voltar para alunos"
      />
    )
  }

  return (
    <Card>
      <form action={action} className="max-w-2xl space-y-5">
        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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

        <p className="rounded-xl bg-surface-muted px-4 py-3 text-xs text-ink-muted">
          A mensalidade é definida depois, ao matricular o aluno em um plano no perfil dele.
        </p>

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

        <label className="flex items-start gap-2.5 rounded-xl border border-hairline bg-surface-muted/30 p-3 text-sm">
          <input type="checkbox" name="notifyEmail" className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span>
            <span className="font-medium text-ink">Receber notificações por e-mail</span>
            <span className="block text-xs text-ink-muted">Aulas, cobranças e relatórios chegam no e-mail do aluno. (No Premium, as mensagens vão pelo WhatsApp oficial.)</span>
          </span>
        </label>

        <Field
          label="Objetivos"
          htmlFor="objectives"
          error={fe.objectives}
          hint="Um por linha — viram metas do aluno"
        >
          <Textarea id="objectives" name="objectives" rows={4} />
        </Field>

        <SubmitButton pendingLabel="Criando…">Criar aluno</SubmitButton>
      </form>
    </Card>
  )
}
