'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
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
  monthly_fee: number | null
  due_day: number | null
  status: string
  notify_to: string | null
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
    <Card>
      <form action={action} className="max-w-2xl space-y-5">
        <input type="hidden" name="studentId" value={student.id} />

        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
          <Field label="Mensalidade (R$)" htmlFor="monthlyFee" error={fe.monthlyFee}>
            <Input id="monthlyFee" name="monthlyFee" type="number" min="0" step="0.01" defaultValue={student.monthly_fee ?? ''} />
          </Field>
          <Field label="Dia de vencimento" htmlFor="dueDay" error={fe.dueDay}>
            <Input id="dueDay" name="dueDay" type="number" min="1" max="31" defaultValue={student.due_day ?? ''} />
          </Field>
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

        <Field label="Notas permanentes" htmlFor="permanentNotes" error={fe.permanentNotes}>
          <Textarea id="permanentNotes" name="permanentNotes" defaultValue={student.permanent_notes ?? ''} />
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
