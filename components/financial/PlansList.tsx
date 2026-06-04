'use client'

import { useState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { EditPlanForm, type Plan } from '@/components/financial/PlanForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deletePlan } from '@/lib/actions/plans'
import { billingTypeLabel } from '@/lib/finance'
import { formatBRL } from '@/lib/format'

function ageLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} anos`
  if (min != null) return `${min}+ anos`
  if (max != null) return `até ${max} anos`
  return null
}

export function PlansList({ plans }: { plans: Plan[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (plans.length === 0)
    return <p className="text-sm text-ink-muted">Nenhum plano cadastrado. Crie um ao lado.</p>

  return (
    <div className="space-y-3">
      {plans.map((p) => {
        const perClass = p.billing_type === 'per_class'
        const unit = perClass ? '/aula' : '/mês'
        const age = ageLabel(p.min_age, p.max_age)
        return (
          <Card key={p.id} className="p-4">
            {editingId === p.id ? (
              <EditPlanForm plan={p} onClose={() => setEditingId(null)} />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <Badge tone={perClass ? 'warning' : 'neutral'}>{billingTypeLabel(p.billing_type)}</Badge>
                    {!p.active && <Badge tone="danger">Inativo</Badge>}
                    {age && <span className="text-xs text-ink-muted">· {age}</span>}
                  </div>
                  {p.description && <p className="mt-0.5 text-sm text-ink-muted">{p.description}</p>}
                  <p className="mt-1 text-base font-bold text-brand-700">
                    {formatBRL(p.amount)}
                    <span className="text-xs font-normal text-ink-muted">{unit}</span>
                    {p.early_pay_amount != null && (
                      <span className="ml-2 text-sm font-semibold text-accent-700">
                        {formatBRL(p.early_pay_amount)}
                        <span className="text-xs font-normal text-ink-muted"> com desconto</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(p.id)}>Editar</Button>
                  <DeleteButton
                    action={deletePlan}
                    hidden={{ planId: p.id }}
                    label="Excluir"
                    confirmText={`Excluir o plano "${p.name}"? Matrículas existentes não serão afetadas.`}
                  />
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
