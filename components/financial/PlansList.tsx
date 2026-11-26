'use client'

import { useActionState, useEffect, useState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { EditPlanForm, type Plan } from '@/components/financial/PlanForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconPlus } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import { Field, Input, Select } from '@/components/ui/Field'
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
    return <p className="mt-3 text-sm text-(--sn-text-muted)">Cadastre um aluno primeiro para matricular.</p>
  }

  return (
    <form action={action} className="sn-subpanel mt-3 space-y-3">
      <input type="hidden" name="planId" value={planId} />
      {state.error && <p className="sn-alert" role="alert">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_6.5rem_9.5rem]">
        <Field label="Aluno" htmlFor={`enr-student-${planId}`} error={fe.studentId}>
          <Select id={`enr-student-${planId}`} name="studentId" defaultValue="" required>
            <option value="" disabled>Selecione…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Vencimento" htmlFor={`enr-due-${planId}`} error={fe.dueDay} hint="dia do mês">
          <Input id={`enr-due-${planId}`} name="dueDay" type="number" min="1" max="31" placeholder="10" required />
        </Field>
        <Field label="Valor" htmlFor={`enr-amount-${planId}`} error={fe.customAmount} hint={perClass ? 'por aula' : 'opcional'}>
          <Input id={`enr-amount-${planId}`} name="customAmount" type="number" min="0" step="0.01" placeholder="igual ao plano" />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <InfoButton label="Sobre a matrícula">Se o aluno já tem uma matrícula ativa, ela é substituída por esta.</InfoButton>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onDone} className="sn-btn sn-btn-sm sn-btn-ghost">Cancelar</button>
          <SubmitButton fullWidth={false} pendingLabel="Matriculando…">Matricular</SubmitButton>
        </div>
      </div>
    </form>
  )
}

export function PlansList({ plans, counts, students }: { plans: Plan[]; counts: Record<string, number>; students: StudentOption[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  if (plans.length === 0)
    return <p className="sn-card text-[15px] text-(--sn-text-muted)">Nenhum plano ainda.</p>

  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      {plans.map((p) => {
        const perClass = p.billing_type === 'per_class'
        const unit = perClass ? '/aula' : '/mês'
        const age = ageLabel(p.min_age, p.max_age)
        const count = counts[p.id] ?? 0
        return (
          <Card key={p.id} className="flex flex-col p-5">
            {editingId === p.id ? (
              <EditPlanForm plan={p} onClose={() => setEditingId(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-[17px] font-semibold tracking-tight text-(--sn-ink)">{p.name}</p>
                  <Badge tone={perClass ? 'warning' : 'neutral'}>{billingTypeLabel(p.billing_type)}</Badge>
                  {!p.active && <Badge tone="danger">Inativo</Badge>}
                </div>
                {p.description && <p className="mt-1 mb-0 text-sm text-(--sn-text-muted)">{p.description}</p>}

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[30px] font-light leading-tight tracking-tight tabular-nums text-(--sn-ink)">
                    {formatBRL(p.amount)}
                    <span className="ml-0.5 text-sm text-(--sn-text-muted)">{unit}</span>
                  </span>
                  {p.early_pay_amount != null && (
                    <span className="text-sm font-medium text-[#2f6b4f]">
                      {formatBRL(p.early_pay_amount)}
                      <span className="text-xs font-normal text-(--sn-text-muted)"> até o vencimento</span>
                    </span>
                  )}
                  {age && <span className="text-xs text-(--sn-text-muted)">{age}</span>}
                </div>

                <span className={`sn-badge mt-3 w-fit ${count > 0 ? 'sn-badge-brand' : 'sn-badge-neutral'}`}>
                  {count === 0 ? 'Sem alunos' : `${count} aluno${count > 1 ? 's' : ''}`}
                </span>

                {/* Ações no rodapé do card */}
                <div className="mt-4 flex items-center justify-between gap-2 pt-3 shadow-[inset_0_1px_0_var(--sn-hairline)]">
                  <Button size="sm" onClick={() => setEnrollingId(enrollingId === p.id ? null : p.id)}>
                    <IconPlus /> Matricular
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)}>Editar</Button>
                    <DeleteButton
                      action={deletePlan}
                      hidden={{ planId: p.id }}
                      label="Excluir"
                      confirmText={`Excluir o plano "${p.name}"? Matrículas existentes não serão afetadas.`}
                    />
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
