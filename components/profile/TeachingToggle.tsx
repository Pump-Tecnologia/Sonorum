'use client'

import { useActionState, useState, useTransition } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { InfoButton } from '@/components/ds/InfoButton'
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
        <div className="flex items-center gap-1">
          <h2 className="sn-card-title">Também dou aula</h2>
          <InfoButton label="Sobre dar aula">Ligado, você aparece como professor na agenda e pode lançar aulas suas.</InfoButton>
        </div>
        <Button variant={checked ? 'secondary' : 'primary'} onClick={toggle} disabled={isPending}>
          {checked ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
      {error && <p className="sn-alert mt-3" role="alert">{error}</p>}

      {checked && (
        <form action={instrumentsAction} className="mt-4 space-y-3 pt-4 shadow-[inset_0_1px_0_var(--sn-hairline)]">
          {instrumentsState.ok && (
            <p className="sn-notice-ok" role="status">Instrumentos salvos</p>
          )}
          {instrumentsState.error && (
            <p className="sn-alert" role="alert">{instrumentsState.error}</p>
          )}
          <Field label="Instrumentos que você dá aula" htmlFor="instruments" hint="Separe por vírgula">
            <Input
              id="instruments"
              name="instruments"
              defaultValue={(instruments ?? []).join(', ')}
              placeholder="Ex.: Violão, Piano"
            />
          </Field>
          <div>
            <SubmitButton pendingLabel="Salvando…">Salvar instrumentos</SubmitButton>
          </div>
        </form>
      )}
    </div>
  )
}
