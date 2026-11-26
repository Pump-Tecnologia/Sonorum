'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { InfoButton } from '@/components/ds/InfoButton'
import { Field, Textarea } from '@/components/ui/Field'
import type { ImportState } from '@/lib/actions/import'

type Action = (prev: ImportState, formData: FormData) => Promise<ImportState>

const initial: ImportState = { ok: false }

// Importação em lote por "colar" (uma pessoa por linha). Cada conta criada
// recebe link de uso único para definir a senha.
export function ImportForm({ action, help, placeholder }: { action: Action; help: string; placeholder: string }) {
  const [state, formAction] = useActionState(action, initial)
  const failures = state.failures ?? []

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="space-y-4"
    >
      <Field label="Uma pessoa por linha" htmlFor="import-rows" hint={help}>
        <Textarea id="import-rows" name="rows" rows={10} placeholder={placeholder} className="font-mono text-sm" />
      </Field>

      {state.error && <p className="sn-alert" role="alert">{state.error}</p>}

      {state.ok && (
        <div className="space-y-2 rounded-(--sn-radius-lg) bg-(--sn-mint-soft) p-4 text-(--sn-ink-soft)" role="status">
          <p className="m-0 text-[15px] font-medium">
            {state.created === 1 ? '1 conta criada' : `${state.created} contas criadas`}{failures.length > 0 && `, ${failures.length} com erro`}
          </p>
          {failures.length > 0 && (
            <ul className="m-0 space-y-1 pl-0 text-sm">
              {failures.map((f, i) => (
                <li key={i} className="list-none">
                  Linha {f.line}: <strong className="font-medium">{f.value}</strong> ({f.reason})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <SubmitButton fullWidth={false} pendingLabel="Importando…">Importar</SubmitButton>
        <InfoButton label="Sobre a importação">
          Cada conta criada recebe um link de uso único para definir a senha. Até 200 pessoas por importação.
        </InfoButton>
      </div>
    </form>
  )
}
