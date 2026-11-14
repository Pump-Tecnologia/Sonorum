'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { Field, FieldRow, Input, Select } from '@/components/ds/Field'
import styles from '@/components/financial/financial.module.css'
import { createCharge, type CreateChargeState } from '@/lib/actions/charges'
import { formatBRL } from '@/lib/format'

export interface StudentPlanOption {
  id: string
  name: string
  // Plano/matrícula ativa do aluno (null = sem matrícula).
  plan: { name: string; billingType: string; unit: number } | null
}

const initial: CreateChargeState = { ok: false }

function billingLabel(p: { billingType: string; unit: number }): string {
  return p.billingType === 'per_class'
    ? `Por aula: ${formatBRL(p.unit)} × aulas do mês`
    : `Mensalidade: ${formatBRL(p.unit)} por mês`
}

// Criação de cobrança plano-primeiro: ao escolher o aluno, traz o tipo de
// cobrança do plano dele. "Cobrança avulsa" sobrescreve com valor e descrição.
export function ChargeCreator({ students, defaultDue }: { students: StudentPlanOption[]; defaultDue: string }) {
  const [state, action] = useActionState(createCharge, initial)
  const [studentId, setStudentId] = useState('')
  const [avulsa, setAvulsa] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state.ok) return
    const reset = window.setTimeout(() => {
      formRef.current?.reset()
      setStudentId('')
      setAvulsa(false)
    }, 0)
    return () => window.clearTimeout(reset)
  }, [state])

  const fe = state.fieldErrors ?? {}
  const selected = students.find((s) => s.id === studentId) ?? null

  if (students.length === 0) {
    return <p className={styles.empty}>Cadastre um aluno primeiro para gerar cobranças.</p>
  }

  return (
    <form
      ref={formRef}
      action={action}
      onReset={(event) => {
        if (!state.ok) event.preventDefault()
      }}
      className={styles.creator}
    >
      {state.ok && <p className={styles.ok} role="status">Cobrança criada. Ela já aparece na lista do mês.</p>}
      {state.error && <p className={styles.warn} role="alert">{state.error}</p>}

      <Field label="Aluno" htmlFor="studentId" error={fe.studentId}>
        <Select id="studentId" name="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} required invalid={!!fe.studentId}>
          <option value="" disabled>Selecione…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Vencimento" htmlFor="dueDate" error={fe.dueDate}>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDue} required invalid={!!fe.dueDate} />
      </Field>

      {/* Resumo do plano (cobrança padrão) quando NÃO é avulsa */}
      {!avulsa && selected && (
        selected.plan ? (
          <p className={styles.planNote}><strong>Plano {selected.plan.name}</strong>{billingLabel(selected.plan)}</p>
        ) : (
          <p className={styles.warn}>Este aluno não tem matrícula ativa. Marque “Cobrança avulsa” ou matricule-o num plano.</p>
        )
      )}

      <label className={styles.toggle}>
        <input type="checkbox" name="avulsa" checked={avulsa} onChange={(e) => setAvulsa(e.target.checked)} />
        <span>
          Cobrança avulsa
          <small>Valor e descrição à mão, sem usar o plano do aluno.</small>
        </span>
      </label>

      {avulsa && (
        <FieldRow>
          <Field label="Valor (R$)" htmlFor="amount" error={fe.amount}>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="0,00" required={avulsa} invalid={!!fe.amount} />
          </Field>
          <Field label="Descrição" htmlFor="description" error={fe.description} hint="Opcional">
            <Input id="description" name="description" placeholder="Ex.: Material" maxLength={120} />
          </Field>
        </FieldRow>
      )}

      <div>
        <SubmitButton pendingLabel="Criando…">Criar cobrança</SubmitButton>
      </div>
    </form>
  )
}
