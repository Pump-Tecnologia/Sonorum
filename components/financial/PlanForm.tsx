'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { SubmitButton } from '@/components/ds/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { BILLING_TYPES } from '@/lib/finance'
import { createPlan, updatePlan, type PlanActionState } from '@/lib/actions/plans'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[13px] font-medium text-(--sn-text-subtle)">{children}</p>
}

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
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
      {/* Identidade */}
      <div className="space-y-4">
        <SectionLabel>Identidade</SectionLabel>
        <Field label="Nome" htmlFor={`name-${k}`} error={fe.name}>
          <Input id={`name-${k}`} name="name" defaultValue={plan?.name} required placeholder="Ex: Kids, Básico, Intermediário…" />
        </Field>
        <Field label="Descrição (opcional)" htmlFor={`desc-${k}`} error={fe.description}>
          <Textarea id={`desc-${k}`} name="description" rows={2} defaultValue={plan?.description ?? ''} placeholder="Ex: específico de um instrumento ou canto" />
        </Field>
      </div>

      {/* Cobrança */}
      <div className="space-y-4">
        <SectionLabel>Cobrança</SectionLabel>

        {/* Tipo: seletor segmentado (mais claro que dropdown) */}
        <input type="hidden" name="billingType" value={billingType} />
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cobrança">
          {BILLING_TYPES.map((b) => {
            const selected = billingType === b.value
            return (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setBillingType(b.value)}
                className={cn(
                  'cursor-pointer rounded-(--sn-radius-lg) border-0 p-3.5 text-left transition-colors',
                  selected ? 'bg-(--sn-ink) text-white' : 'bg-white/65 text-(--sn-ink) shadow-[inset_0_0_0_1px_var(--sn-hairline-strong)] hover:bg-(--sn-mint-soft)',
                )}
              >
                <span className="block text-[15px] font-medium">{b.label}</span>
                <span className={cn('mt-0.5 block text-xs', selected ? 'text-[#c9ddd1]' : 'text-(--sn-text-muted)')}>{b.hint}</span>
              </button>
            )
          })}
        </div>

        <Field label={isPerClass ? 'Valor por aula (R$)' : 'Valor mensal (R$)'} htmlFor={`amount-${k}`} error={fe.amount}>
          <Input id={`amount-${k}`} name="amount" type="number" min="0" step="0.01" defaultValue={plan?.amount ?? ''} required placeholder="0,00" />
        </Field>

        {isPerClass ? (
          <p className="sn-subpanel m-0 py-3 text-sm text-(--sn-ink-soft)">Cobrança do mês: valor por aula × aulas com presença lançada.</p>
        ) : (
          <Field
            label="Valor com desconto de pontualidade (R$)"
            htmlFor={`early-${k}`}
            error={fe.earlyPayAmount}
            hint="Vale até o vencimento. Vazio, sem desconto."
          >
            <Input id={`early-${k}`} name="earlyPayAmount" type="number" min="0" step="0.01" defaultValue={plan?.early_pay_amount ?? ''} placeholder="Sem desconto" />
          </Field>
        )}
      </div>

      {/* Restrições */}
      <div className="space-y-4">
        <SectionLabel>Restrição de idade (opcional)</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade mínima" htmlFor={`minage-${k}`} error={fe.minAge}>
            <Input id={`minage-${k}`} name="minAge" type="number" min="0" max="120" defaultValue={plan?.min_age ?? ''} placeholder="—" />
          </Field>
          <Field label="Idade máxima" htmlFor={`maxage-${k}`} error={fe.maxAge}>
            <Input id={`maxage-${k}`} name="maxAge" type="number" min="0" max="120" defaultValue={plan?.max_age ?? ''} placeholder="—" />
          </Field>
        </div>
      </div>

      <label className="sn-checkrow">
        <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} />
        Plano ativo (disponível para novas matrículas)
      </label>
    </div>
  )
}

export function CreatePlanForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const [state, action] = useActionState(createPlan, initial)
  const fe = state.fieldErrors ?? {}

  // Após criar, volta pra lista (padrão de tela própria).
  useEffect(() => {
    if (state.ok && redirectTo) router.push(redirectTo)
  }, [state.ok, redirectTo, router])

  if (state.ok && !redirectTo) return <p className="sn-notice-ok" role="status">Plano criado</p>

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="sn-alert" role="alert">{state.error}</p>}
      <PlanFields fe={fe} />
      <SubmitButton className="w-full" pendingLabel="Criando…">Criar plano</SubmitButton>
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
      {state.error && <p className="sn-alert" role="alert">{state.error}</p>}
      <PlanFields plan={plan} fe={fe} />
      <div className="flex gap-2">
        <SubmitButton className="w-full" pendingLabel="Salvando…">Salvar</SubmitButton>
        <button type="button" onClick={onClose} className="sn-btn sn-btn-ghost">Cancelar</button>
      </div>
    </form>
  )
}
