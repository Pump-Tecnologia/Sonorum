'use client'

import { useActionState, useState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { BILLING_TYPES } from '@/lib/finance'
import { createPlan, updatePlan, type PlanActionState } from '@/lib/actions/plans'

export interface Plan {
  id: string
  name: string
  description: string | null
  amount: number
  billing_type: string
  early_pay_amount: number | null
  min_age: number | null
  max_age: number | null
  active: boolean
}

const initial: PlanActionState = { ok: false }

// Campos compartilhados entre criar e editar. billingType controla o que aparece:
// "por aula" não tem desconto de pontualidade e o valor vira "por aula".
function PlanFields({ plan, fe }: { plan?: Plan; fe: Record<string, string> }) {
  const [billingType, setBillingType] = useState(plan?.billing_type ?? 'monthly')
  const isPerClass = billingType === 'per_class'
  const k = plan?.id ?? 'new'

  return (
    <>
      <Field label="Nome" htmlFor={`name-${k}`} error={fe.name}>
        <Input id={`name-${k}`} name="name" defaultValue={plan?.name} required placeholder="Ex: Kids, Básico, Intermediário…" />
      </Field>

      <Field label="Descrição (opcional)" htmlFor={`desc-${k}`} error={fe.description}>
        <Textarea id={`desc-${k}`} name="description" rows={2} defaultValue={plan?.description ?? ''} placeholder="Ex: específico de um instrumento ou canto" />
      </Field>

      <Field label="Tipo de cobrança" htmlFor={`billing-${k}`} error={fe.billingType}>
        <Select id={`billing-${k}`} name="billingType" value={billingType} onChange={(e) => setBillingType(e.target.value)}>
          {BILLING_TYPES.map((b) => (
            <option key={b.value} value={b.value}>{b.label} — {b.hint}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={isPerClass ? 'Valor por aula (R$)' : 'Valor mensal (R$)'} htmlFor={`amount-${k}`} error={fe.amount}>
          <Input id={`amount-${k}`} name="amount" type="number" min="0" step="0.01" defaultValue={plan?.amount ?? ''} required />
        </Field>
        {!isPerClass && (
          <Field label="Com desconto de pontualidade (R$)" htmlFor={`early-${k}`} error={fe.earlyPayAmount} hint="Opcional — aplicado se pago até o vencimento">
            <Input id={`early-${k}`} name="earlyPayAmount" type="number" min="0" step="0.01" defaultValue={plan?.early_pay_amount ?? ''} placeholder="—" />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade mínima (opcional)" htmlFor={`minage-${k}`} error={fe.minAge}>
          <Input id={`minage-${k}`} name="minAge" type="number" min="0" max="120" defaultValue={plan?.min_age ?? ''} placeholder="—" />
        </Field>
        <Field label="Idade máxima (opcional)" htmlFor={`maxage-${k}`} error={fe.maxAge}>
          <Input id={`maxage-${k}`} name="maxAge" type="number" min="0" max="120" defaultValue={plan?.max_age ?? ''} placeholder="—" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} className="h-4 w-4 rounded border-hairline accent-brand-600" />
        Plano ativo (disponível para novas matrículas)
      </label>
    </>
  )
}

export function CreatePlanForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action] = useActionState(async (prev: PlanActionState, fd: FormData) => {
    const res = await createPlan(prev, fd)
    if (res.ok) onSuccess?.()
    return res
  }, initial)
  const fe = state.fieldErrors ?? {}
  if (state.ok) return <p className="text-sm font-medium text-accent-800">Plano criado!</p>

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <PlanFields fe={fe} />
      <SubmitButton pendingLabel="Criando…">Criar plano</SubmitButton>
    </form>
  )
}

export function EditPlanForm({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [state, action] = useActionState(async (prev: PlanActionState, fd: FormData) => {
    const res = await updatePlan(prev, fd)
    if (res.ok) onClose()
    return res
  }, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="planId" value={plan.id} />
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <PlanFields plan={plan} fe={fe} />
      <div className="flex gap-2">
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
        <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">Cancelar</button>
      </div>
    </form>
  )
}
