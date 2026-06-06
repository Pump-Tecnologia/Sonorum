'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import type { ImportState } from '@/lib/actions/import'

type Action = (prev: ImportState, formData: FormData) => Promise<ImportState>

const initial: ImportState = { ok: false }

// Importação em lote por "colar" (uma pessoa por linha). Cada conta criada
// recebe a senha de acesso por e-mail automaticamente.
export function ImportForm({ action, help, placeholder }: { action: Action; help: string; placeholder: string }) {
  const [state, formAction] = useActionState(action, initial)
  const failures = state.failures ?? []

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-ink-muted">{help}</p>

      <textarea
        name="rows"
        rows={10}
        placeholder={placeholder}
        className="w-full rounded-xl border border-hairline bg-surface p-3 font-mono text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-400 focus:outline-2 focus:outline-offset-2 focus:outline-brand-500"
      />

      <p className="text-xs text-ink-muted">
        Cada conta criada recebe a senha de acesso por e-mail. Máximo de 200 por importação.
      </p>

      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

      {state.ok && (
        <div className="space-y-3 rounded-xl border border-hairline bg-surface-muted/30 p-4">
          <p className="text-sm font-semibold text-ink">
            {state.created} conta(s) criada(s){failures.length > 0 && ` · ${failures.length} com erro`}
          </p>
          {failures.length > 0 && (
            <ul className="space-y-1 text-xs text-ink-muted">
              {failures.map((f, i) => (
                <li key={i}>
                  Linha {f.line}: <span className="font-medium text-ink">{f.value}</span> — {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SubmitButton fullWidth={false} pendingLabel="Importando…">Importar</SubmitButton>
    </form>
  )
}
