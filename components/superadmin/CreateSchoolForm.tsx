'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { createSchool, type SchoolActionState } from '@/lib/actions/schools'

const initial: SchoolActionState = { ok: false }

export function CreateSchoolForm() {
  const [state, action] = useActionState(createSchool, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok) {
    return (
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-accent-800">Escola criada! ✓</p>
        <p className="text-sm text-ink-muted">
          Admin: <span className="font-medium text-ink">{state.createdEmail}</span>
          <br />
          Senha temporária:{' '}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-ink">
            {state.tempPassword}
          </code>
        </p>
        <p className="text-xs text-ink-muted">
          Anote agora — esta senha não será exibida de novo. Peça ao admin para trocá-la no primeiro
          acesso.
        </p>
        <Link href="/superadmin" className="inline-block text-sm font-semibold text-brand-600">
          ← Voltar para escolas
        </Link>
      </Card>
    )
  }

  return (
    <Card>
      <form action={action} className="max-w-lg space-y-5">
        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        <Field label="Nome da escola" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" required />
        </Field>

        <Field label="E-mail do administrador" htmlFor="adminEmail" error={fe.adminEmail}>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Plano" htmlFor="planType" error={fe.planType}>
            <Select id="planType" name="planType" defaultValue="free">
              <option value="free">Essencial (grátis)</option>
              <option value="professional">Profissional</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>

          <Field label="Mensalidade (R$)" htmlFor="monthlyPrice" error={fe.monthlyPrice}>
            <Input id="monthlyPrice" name="monthlyPrice" type="number" min="0" step="0.01" defaultValue="0" />
          </Field>
        </div>

        <SubmitButton pendingLabel="Criando…">Criar escola</SubmitButton>
      </form>
    </Card>
  )
}
