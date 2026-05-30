'use client'

import { useState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { EditPlanForm } from '@/components/financial/PlanForm'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deletePlan } from '@/lib/actions/plans'
import { formatBRL } from '@/lib/format'

interface Plan { id: string; name: string; description: string | null; amount: number }

export function PlansList({ plans }: { plans: Plan[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (plans.length === 0)
    return <p className="text-sm text-ink-muted">Nenhum plano cadastrado. Crie um abaixo.</p>

  return (
    <div className="space-y-3">
      {plans.map((p) => (
        <Card key={p.id} className="p-4">
          {editingId === p.id ? (
            <EditPlanForm plan={p} onClose={() => setEditingId(null)} />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{p.name}</p>
                {p.description && <p className="text-sm text-ink-muted mt-0.5">{p.description}</p>}
                <p className="mt-1 text-base font-bold text-brand-700">{formatBRL(p.amount)}<span className="text-xs font-normal text-ink-muted">/mês</span></p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => setEditingId(p.id)}>Editar</Button>
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
      ))}
    </div>
  )
}
