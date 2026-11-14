'use client'

import { useActionState, useState, useTransition } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import {
  disableSelfTeaching,
  enableSelfTeaching,
  updateOwnInstruments,
  type ToggleTeachingResult,
} from '@/lib/actions/teachers'

interface TeachingToggleProps {
  isTeacher: boolean
  instruments?: string[] | null
}

const initialInstruments: ToggleTeachingResult = { ok: false }

// Só aparece pro role='admin' (ver profile/page.tsx) — role='teacher' já dá
// aula por definição. Liga/desliga a linha do admin em public.teachers e, se
// ativo, deixa editar os instrumentos dele (única tela onde isso é possível
// pra contas presas a 1 professor, que não têm /admin/teachers).
export function TeachingToggle({ isTeacher, instruments }: TeachingToggleProps) {
  const [checked, setChecked] = useState(isTeacher)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [instrumentsState, instrumentsAction] = useActionState(updateOwnInstruments, initialInstruments)

  function toggle() {
    const next = !checked
    setError(null)
    startTransition(async () => {
      const result = next ? await enableSelfTeaching(new FormData()) : await disableSelfTeaching(new FormData())
      if (result.ok) {
        setChecked(next)
      } else {
        setError(result.error ?? 'Não foi possível atualizar.')
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Também dou aula</p>
          <p className="text-sm text-ink-muted">
            Ative pra aparecer como professor na agenda e poder lançar aulas suas.
          </p>
        </div>
        <Button variant={checked ? 'secondary' : 'primary'} onClick={toggle} disabled={isPending}>
          {checked ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {checked && (
        <form action={instrumentsAction} className="mt-4 border-t border-hairline pt-4">
          {instrumentsState.ok && (
            <p className="mb-2 text-sm font-medium text-accent-700">Instrumentos salvos!</p>
          )}
          {instrumentsState.error && (
            <p className="mb-2 text-sm text-red-600">{instrumentsState.error}</p>
          )}
          <Field label="Instrumentos que você dá aula" htmlFor="instruments" hint="Separe por vírgula">
            <Input
              id="instruments"
              name="instruments"
              defaultValue={(instruments ?? []).join(', ')}
              placeholder="Ex.: Violão, Piano"
            />
          </Field>
          <div className="mt-3">
            <SubmitButton pendingLabel="Salvando…">Salvar instrumentos</SubmitButton>
          </div>
        </form>
      )}
    </div>
  )
}
