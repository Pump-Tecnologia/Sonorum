'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { InfoButton } from '@/components/ds/InfoButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { InstrumentFields } from '@/components/ui/InstrumentFields'
import { updateStudent, type UpdateActionState } from '@/lib/actions/update-user'

interface StudentData {
  id: string
  name: string
  email: string
  phone: string | null
  parent_contact: string | null
  instrument_category: string | null
  instrument: unknown
  status: string
  notify_to: string | null
  notify_email: boolean | null
  permanent_notes: string | null
}

const initial: UpdateActionState = { ok: false }

function instrumentStr(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'string') return v
  return ''
}

export function EditStudentForm({ student }: { student: StudentData }) {
  const [state, action] = useActionState(updateStudent, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card className="max-w-3xl">
      <form
        action={action}
        onReset={(event) => event.preventDefault()}
        className="space-y-5"
      >
        <input type="hidden" name="studentId" value={student.id} />

        {state.error && (
          <p className="sn-alert" role="alert">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name" error={fe.name}>
            <Input id="name" name="name" defaultValue={student.name} required />
          </Field>
          <Field label="E-mail" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" defaultValue={student.email} required />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={fe.phone}>
            <Input id="phone" name="phone" defaultValue={student.phone ?? ''} />
          </Field>
          <Field label="Responsável" htmlFor="parentContact" error={fe.parentContact}>
            <Input id="parentContact" name="parentContact" defaultValue={student.parent_contact ?? ''} />
          </Field>
          <InstrumentFields
            defaultCategory={student.instrument_category}
            defaultInstrument={instrumentStr(student.instrument)}
            categoryError={fe.instrumentCategory}
            instrumentError={fe.instrument}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status" error={fe.status}>
            <Select id="status" name="status" defaultValue={student.status}>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="inactive">Inativo</option>
            </Select>
          </Field>
          <Field label="Notificar quem" htmlFor="notifyTo" error={fe.notifyTo} hint="Aulas, cobranças e relatórios">
            <Select id="notifyTo" name="notifyTo" defaultValue={student.notify_to ?? 'both'}>
              <option value="student">Aluno</option>
              <option value="parent">Responsável</option>
              <option value="both">Aluno e responsável</option>
            </Select>
          </Field>
        </div>

        <div className="sn-check-wrap">
          <label className="sn-checkrow">
            <input type="checkbox" name="notifyEmail" defaultChecked={Boolean(student.notify_email)} />
            Receber notificações por e-mail
          </label>
          <InfoButton label="Sobre as notificações" align="end">
            Aulas, cobranças e relatórios chegam no e-mail do aluno. No Premium, as mensagens vão pelo WhatsApp oficial.
          </InfoButton>
        </div>

        <Field label="Notas permanentes" htmlFor="permanentNotes" error={fe.permanentNotes}>
          <Textarea id="permanentNotes" name="permanentNotes" defaultValue={student.permanent_notes ?? ''} />
        </Field>

        <SubmitButton className="w-full" pendingLabel="Salvando…">Salvar alterações</SubmitButton>
      </form>
    </Card>
  )
}
