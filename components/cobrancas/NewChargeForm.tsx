'use client'

import { useActionState, useEffect, useRef } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input } from '@/components/ui/Field'
import { createAdHocCharge, type AdHocChargeState } from '@/lib/actions/charges'

interface StudentOption {
  id: string
  name: string
}

const initial: AdHocChargeState = { ok: false }

// Form de cobrança avulsa: aluno + valor + vencimento + descrição.
export function NewChargeForm({ students }: { students: StudentOption[] }) {
  const [state, action] = useActionState(createAdHocCharge, initial)
  const fe = state.fieldErrors ?? {}
  const formRef = useRef<HTMLFormElement>(null)

  // Limpa o form após criar com sucesso.
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  const today = new Date().toISOString().slice(0, 10)

  if (students.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Cadastre um aluno primeiro para poder gerar cobranças.
      </p>
    )
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.ok && (
        <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm font-medium text-accent-800">
          Cobrança criada! O link de pagamento PIX já está disponível na lista abaixo.
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
            defaultValue=""
            required
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
          >
            <option value="" disabled>Selecione…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Valor (R$)" htmlFor="amount" error={fe.amount}>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required />
        </Field>

        <Field label="Vencimento" htmlFor="dueDate" error={fe.dueDate}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={today} required />
        </Field>

        <Field label="Descrição (opcional)" htmlFor="description" error={fe.description}>
          <Input id="description" name="description" placeholder="Ex.: Mensalidade de junho" maxLength={120} />
        </Field>
      </div>

      <SubmitButton pendingLabel="Criando…">Gerar cobrança PIX</SubmitButton>
    </form>
  )
}
