'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input } from '@/components/ui/Field'
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
    ? `Por aula · ${formatBRL(p.unit)}/aula × aulas do mês`
    : `Mensalidade · ${formatBRL(p.unit)}/mês`
}

// Criação de cobrança plano-primeiro: ao escolher o aluno, traz o tipo de
// cobrança do plano dele. "Cobrança avulsa" (checkbox) sobrescreve com valor
// e descrição manuais.
export function ChargeCreator({ students, defaultDue }: { students: StudentPlanOption[]; defaultDue: string }) {
  const [state, action] = useActionState(createCharge, initial)
  const [studentId, setStudentId] = useState('')
  const [avulsa, setAvulsa] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      setStudentId('')
      setAvulsa(false)
    }
  }, [state.ok])

  const fe = state.fieldErrors ?? {}
  const selected = students.find((s) => s.id === studentId) ?? null

  if (students.length === 0) {
    return <p className="text-sm text-ink-muted">Cadastre um aluno primeiro para gerar cobranças.</p>
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.ok && (
        <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm font-medium text-accent-800">
          Cobrança gerada! Veja na lista do mês abaixo.
        </p>
      )}
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Aluno" htmlFor="studentId" error={fe.studentId}>
          <select
            id="studentId"
            name="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecione…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Vencimento" htmlFor="dueDate" error={fe.dueDate}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDue} required />
        </Field>
      </div>

      {/* Resumo do plano (cobrança padrão) quando NÃO é avulsa */}
      {!avulsa && selected && (
        selected.plan ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-sm">
            <span className="font-medium text-ink">Plano {selected.plan.name}</span>
            <span className="block text-ink-muted">{billingLabel(selected.plan)}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Este aluno não tem matrícula ativa. Marque <strong>Cobrança avulsa</strong> abaixo ou matricule-o em um plano.
          </div>
        )
      )}

      <label className="flex items-start gap-2.5 rounded-xl border border-hairline bg-surface-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          name="avulsa"
          checked={avulsa}
          onChange={(e) => setAvulsa(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="font-medium text-ink">Cobrança avulsa</span>
          <span className="block text-xs text-ink-muted">Valor e descrição manuais, sem usar o plano do aluno.</span>
        </span>
      </label>

      {avulsa && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor (R$)" htmlFor="amount" error={fe.amount}>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required={avulsa} />
          </Field>
          <Field label="Descrição (opcional)" htmlFor="description" error={fe.description}>
            <Input id="description" name="description" placeholder="Ex.: Material didático" maxLength={120} />
          </Field>
        </div>
      )}

      <SubmitButton pendingLabel="Gerando…">Gerar cobrança</SubmitButton>
    </form>
  )
}
