'use client'

import { useActionState } from 'react'

import { LinkButton, SubmitButton } from '@/components/ds/Button'
import { Field, FieldRow, Input, Select } from '@/components/ds/Field'
import { IconArrowLeft, IconCheck } from '@/components/ds/icons'
import { SchoolPlanOptions } from '@/components/superadmin/SchoolPlanOptions'
import { Card } from '@/components/ui/Card'
import { createSchool, type SchoolActionState } from '@/lib/actions/schools'

const initial: SchoolActionState = { ok: false }

export function CreateSchoolForm() {
  const [state, action] = useActionState(createSchool, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok) {
    return (
      <Card className="max-w-xl" role="status">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-(--sn-mint-soft) text-(--sn-ink-soft)" aria-hidden="true">
          <IconCheck className="h-6 w-6" />
        </span>
        <h2 className="m-0 text-2xl font-semibold tracking-tight text-(--sn-ink)">Escola criada</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-(--sn-text-muted)">
          Enviamos para <strong className="font-medium text-(--sn-ink)">{state.createdEmail}</strong> um link de uso único para definir a senha e entrar.
        </p>
        <LinkButton href="/superadmin" variant="soft" className="mt-6"><IconArrowLeft /> Voltar para a visão geral</LinkButton>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl">
      <form action={action} className="space-y-5">
        {state.error && <p className="sn-alert" role="alert">{state.error}</p>}

        <Field label="Nome da escola" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" placeholder="Ex.: Escola Tom Maior" autoComplete="off" invalid={Boolean(fe.name)} required />
        </Field>

        <Field label="E-mail do administrador" htmlFor="adminEmail" error={fe.adminEmail}>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@escola.com"
            autoComplete="off"
            invalid={Boolean(fe.adminEmail)}
            required
          />
        </Field>

        <FieldRow>
          <Field label="Plano" htmlFor="planType" error={fe.planType}>
            <Select id="planType" name="planType" defaultValue="free">
              <SchoolPlanOptions />
            </Select>
          </Field>

          <Field label="Mensalidade (R$)" htmlFor="monthlyPrice" error={fe.monthlyPrice}>
            <Input id="monthlyPrice" name="monthlyPrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue="0" invalid={Boolean(fe.monthlyPrice)} />
          </Field>
        </FieldRow>

        <SubmitButton className="w-full" pendingLabel="Criando…">Criar escola</SubmitButton>
      </form>
    </Card>
  )
}
