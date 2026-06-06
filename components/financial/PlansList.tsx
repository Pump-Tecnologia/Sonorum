'use client'

import { useActionState, useEffect, useState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { EditPlanForm, type Plan } from '@/components/financial/PlanForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { deletePlan } from '@/lib/actions/plans'
import { enrollStudent, type EnrollActionState } from '@/lib/actions/enrollments'
import { billingTypeLabel } from '@/lib/finance'
import { formatBRL } from '@/lib/format'

interface StudentOption {
  id: string
  name: string
}

function ageLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} anos`
  if (min != null) return `${min}+ anos`
  if (max != null) return `até ${max} anos`
  return null
}

// Matrícula rápida a partir do plano (conecta plano → aluno → cobrança).
function EnrollInline({ planId, perClass, students, onDone }: { planId: string; perClass: boolean; students: StudentOption[]; onDone: () => void }) {
  const [state, action] = useActionState(enrollStudent, { ok: false } as EnrollActionState)
  const fe = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  if (students.length === 0) {
    return <p className="mt-3 text-sm text-ink-muted">Cadastre um aluno primeiro para matricular.</p>
  }

  return (
    <form action={action} className="mt-3 space-y-3 rounded-xl border border-hairline bg-surface-muted/40 p-3">
      <input type="hidden" name="planId" value={planId} />
      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Aluno" htmlFor={`enr-student-${planId}`} error={fe.studentId}>
          <select
            id={`enr-student-${planId}`}
            name="studentId"
            defaultValue=""
            required
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecione…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Dia do vencimento" htmlFor={`enr-due-${planId}`} error={fe.dueDay}>
          <Input id={`enr-due-${planId}`} name="dueDay" type="number" min="1" max="31" placeholder="Ex.: 10" required />
        </Field>
        <Field label={perClass ? 'Preço/aula (opcional)' : 'Valor custom (opcional)'} htmlFor={`enr-amount-${planId}`} error={fe.customAmount}>
          <Input id={`enr-amount-${planId}`} name="customAmount" type="number" min="0" step="0.01" placeholder="—" />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton pendingLabel="Matriculando…">Matricular</SubmitButton>
        <button type="button" onClick={onDone} className="text-sm text-ink-muted hover:text-ink">Cancelar</button>
      </div>
      <p className="text-xs text-ink-muted">Matricular substitui a matrícula ativa anterior do aluno.</p>
    </form>
  )
}

export function PlansList({ plans, counts, students }: { plans: Plan[]; counts: Record<string, number>; students: StudentOption[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  if (plans.length === 0)
    return <p className="text-sm text-ink-muted">Nenhum plano cadastrado. Crie um ao lado.</p>

  return (
    <div className="space-y-3">
      {plans.map((p) => {
        const perClass = p.billing_type === 'per_class'
        const unit = perClass ? '/aula' : '/mês'
        const age = ageLabel(p.min_age, p.max_age)
        const count = counts[p.id] ?? 0
        return (
          <Card key={p.id} className="p-4">
            {editingId === p.id ? (
              <EditPlanForm plan={p} onClose={() => setEditingId(null)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{p.name}</p>
                      <Badge tone={perClass ? 'warning' : 'neutral'}>{billingTypeLabel(p.billing_type)}</Badge>
                      {!p.active && <Badge tone="danger">Inativo</Badge>}
                    </div>
                    {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}

                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-xl font-bold text-brand-700">
                        {formatBRL(p.amount)}
                        <span className="text-xs font-normal text-ink-muted">{unit}</span>
                      </span>
                      {p.early_pay_amount != null && (
                        <span className="text-sm font-semibold text-accent-700">
                          {formatBRL(p.early_pay_amount)}
                          <span className="text-xs font-normal text-ink-muted"> até o venc.</span>
                        </span>
                      )}
                      {age && <span className="text-xs text-ink-muted">{age}</span>}
                    </div>

                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${count > 0 ? 'bg-brand-50 text-brand-700' : 'bg-surface-muted text-ink-muted'}`}>
                      {count === 0 ? 'Sem alunos' : `${count} aluno${count > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Button
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setEnrollingId(enrollingId === p.id ? null : p.id)}
                    >
                      + Matricular
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(p.id)}>Editar</Button>
                      <DeleteButton
                        action={deletePlan}
                        hidden={{ planId: p.id }}
                        label="Excluir"
                        confirmText={`Excluir o plano "${p.name}"? Matrículas existentes não serão afetadas.`}
                      />
                    </div>
                  </div>
                </div>
                {enrollingId === p.id && (
                  <EnrollInline planId={p.id} perClass={perClass} students={students} onDone={() => setEnrollingId(null)} />
                )}
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}
