'use client'

import { useActionState, useState } from 'react'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/ds/Button'
import { Field, FieldRow, Input, Select } from '@/components/ds/Field'
import styles from '@/components/students/student-profile.module.css'
import { cancelEnrollment, enrollStudent, type EnrollActionState } from '@/lib/actions/enrollments'
import { billingTypeLabel } from '@/lib/finance'
import { formatBRL } from '@/lib/format'

interface Plan {
  id: string
  name: string
  amount: number
  billing_type: string
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
  const [planId, setPlanId] = useState(enrollment?.plan?.id ?? '')
  const selectedPlan = plans.find((p) => p.id === planId)
  const isPerClass = selectedPlan?.billing_type === 'per_class'
  const active = enrollment?.status === 'active' ? enrollment : null
  const activeAmount = active
    ? Number(active.custom_amount ?? active.plan?.amount ?? 0)
    : 0
  const activePerClass = active?.plan?.billing_type === 'per_class'

  return (
    <section className={styles.panel} aria-labelledby="enrollment-title">
      <div className={styles.panelHead}>
        <h2 id="enrollment-title" className={styles.panelTitle}>Matrícula</h2>
      </div>

      {active && (
        <div className={styles.plan}>
          <p className={styles.planName}>{active.plan?.name ?? 'Plano'}</p>
          <p className={styles.planAmount}>
            {formatBRL(activeAmount)} <small>{activePerClass ? 'por aula' : 'por mês'}</small>
          </p>
          <p className={styles.planDue}>Vence todo dia {active.due_day}</p>
          <div className={styles.planFoot}>
            <DeleteButton
              action={cancelEnrollment}
              hidden={{ studentId }}
              label="Encerrar matrícula"
              pendingLabel="Encerrando…"
              confirmText="Encerrar a matrícula ativa deste aluno? As cobranças já geradas permanecem no histórico."
              buttonClassName={styles.planCancel}
            />
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className={styles.empty}>
          Nenhum plano cadastrado ainda. <a href="/plans" className={styles.link}>Criar plano</a>
        </p>
      ) : (
        <form action={action} onReset={(event) => event.preventDefault()} className={styles.form}>
          <input type="hidden" name="studentId" value={studentId} />

          {state.error && <p className={`${styles.notice} ${styles.noticeError}`} role="alert">{state.error}</p>}
          {state.ok && <p className={`${styles.notice} ${styles.noticeOk}`} role="status">Matrícula salva.</p>}

          <Field label="Plano" htmlFor="planId" error={fe.planId}>
            <Select id="planId" name="planId" value={planId} onChange={(e) => setPlanId(e.target.value)} invalid={!!fe.planId}>
              <option value="" disabled>Selecione…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatBRL(Number(p.amount))}{p.billing_type === 'per_class' ? '/aula' : '/mês'} ({billingTypeLabel(p.billing_type)})
                </option>
              ))}
            </Select>
          </Field>

          <FieldRow>
            <Field label="Dia do vencimento" htmlFor="dueDay" error={fe.dueDay}>
              <Input id="dueDay" name="dueDay" type="number" min="1" max="31" inputMode="numeric" defaultValue={enrollment?.due_day ?? ''} invalid={!!fe.dueDay} />
            </Field>
            <Field
              label={isPerClass ? 'Preço por aula' : 'Valor mensal'}
              htmlFor="customAmount"
              error={fe.customAmount}
              hint={isPerClass ? 'Vezes as aulas dadas no mês. Vazio usa o do plano.' : 'Vazio usa o valor do plano.'}
            >
              <Input id="customAmount" name="customAmount" type="number" min="0" step="0.01" inputMode="decimal" placeholder={selectedPlan ? String(selectedPlan.amount) : ''} defaultValue={enrollment?.custom_amount ?? ''} invalid={!!fe.customAmount} />
            </Field>
          </FieldRow>

          <div>
            <SubmitButton pendingLabel="Salvando…">{active ? 'Atualizar matrícula' : 'Matricular'}</SubmitButton>
          </div>
        </form>
      )}
    </section>
  )
}
