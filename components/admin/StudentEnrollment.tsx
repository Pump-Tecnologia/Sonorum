'use client'

import { useActionState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { cancelEnrollment, enrollStudent, type EnrollActionState } from '@/lib/actions/enrollments'
import { formatBRL } from '@/lib/format'

interface Plan {
  id: string
  name: string
  amount: number
}

interface Enrollment {
  id: string
  status: string
  due_day: number
  custom_amount: number | null
  plan: Plan | null
}

const initial: EnrollActionState = { ok: false }

export function StudentEnrollment({
  studentId,
  enrollment,
  plans,
}: {
  studentId: string
  enrollment: Enrollment | null
  plans: Plan[]
}) {
  const [state, action] = useActionState(enrollStudent, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-ink">Matrícula</h2>

      {enrollment?.status === 'active' && (
        <div className="mb-4 rounded-xl border border-hairline bg-surface-muted/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">{enrollment.plan?.name ?? '—'}</p>
              <p className="text-sm text-ink-muted">
                {enrollment.custom_amount != null
                  ? formatBRL(Number(enrollment.custom_amount))
                  : formatBRL(Number(enrollment.plan?.amount ?? 0))}
                {' '}· vence dia {enrollment.due_day}
              </p>
            </div>
            <Badge tone="success">Ativo</Badge>
          </div>
          <div className="mt-3 flex justify-end">
            <DeleteButton
              action={cancelEnrollment}
              hidden={{ studentId }}
              label="Cancelar matrícula"
              confirmText="Encerrar a matrícula ativa deste aluno? As cobranças já geradas permanecem no histórico."
              className="text-xs px-2 py-1"
            />
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum plano cadastrado.{' '}
          <a href="/plans" className="font-medium text-brand-600 hover:underline">
            Criar plano
          </a>
        </p>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />

          {state.error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
          )}
          {state.ok && (
            <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm text-accent-800">
              Matrícula atualizada!
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Plano" htmlFor="planId" error={fe.planId}>
              <Select id="planId" name="planId" defaultValue={enrollment?.plan?.id ?? ''}>
                <option value="" disabled>Selecione…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatBRL(Number(p.amount))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dia de vencimento" htmlFor="dueDay" error={fe.dueDay}>
              <Input
                id="dueDay"
                name="dueDay"
                type="number"
                min="1"
                max="31"
                defaultValue={enrollment?.due_day ?? ''}
              />
            </Field>
          </div>

          <Field
            label="Valor personalizado (deixe em branco para usar o do plano)"
            htmlFor="customAmount"
            error={fe.customAmount}
          >
            <Input
              id="customAmount"
              name="customAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={enrollment?.custom_amount ?? ''}
            />
          </Field>

          <SubmitButton pendingLabel="Salvando…">
            {enrollment?.status === 'active' ? 'Atualizar matrícula' : 'Matricular'}
          </SubmitButton>
        </form>
      )}
    </Card>
  )
}
