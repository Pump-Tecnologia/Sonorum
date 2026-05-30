'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { createPlan, updatePlan, type PlanActionState } from '@/lib/actions/plans'

interface Plan { id: string; name: string; description: string | null; amount: number }
const initial: PlanActionState = { ok: false }

export function CreatePlanForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action] = useActionState(async (prev: PlanActionState, fd: FormData) => {
    const res = await createPlan(prev, fd)
    if (res.ok) onSuccess?.()
    return res
  }, initial)
  const fe = state.fieldErrors ?? {}
  if (state.ok) return <p className="text-sm text-accent-800 font-medium">Plano criado!</p>

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>}
      <Field label="Nome" htmlFor="name" error={fe.name}><Input id="name" name="name" required /></Field>
      <Field label="Descrição" htmlFor="description" error={fe.description}><Textarea id="description" name="description" rows={2} /></Field>
      <Field label="Valor (R$)" htmlFor="amount" error={fe.amount}>
        <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
      </Field>
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
    <form action={action} className="space-y-3">
      <input type="hidden" name="planId" value={plan.id} />
      <Field label="Nome" htmlFor={`name-${plan.id}`} error={fe.name}>
        <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} required />
      </Field>
      <Field label="Descrição" htmlFor={`desc-${plan.id}`} error={fe.description}>
        <Textarea id={`desc-${plan.id}`} name="description" rows={2} defaultValue={plan.description ?? ''} />
      </Field>
      <Field label="Valor (R$)" htmlFor={`amount-${plan.id}`} error={fe.amount}>
        <Input id={`amount-${plan.id}`} name="amount" type="number" min="0" step="0.01" defaultValue={plan.amount} required />
      </Field>
      <div className="flex gap-2">
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
        <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">Cancelar</button>
      </div>
    </form>
  )
}
