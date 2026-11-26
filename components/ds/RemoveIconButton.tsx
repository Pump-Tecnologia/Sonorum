'use client'

import { IconTrash } from '@/components/ds/icons'
import { PlainSubmit } from '@/components/ds/PlainSubmit'
import { useArmed } from '@/components/ds/useArmed'
import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

interface RemoveIconButtonProps {
  action: Action
  hidden: Record<string, string>
  /** Nome acessível da lixeira, ex.: "Remover a meta “tocar X”". */
  label: string
  /** Estilo do botão de lixeira (redondo, discreto). */
  className: string
  /** Posição do conjunto (ex.: canto do cartão da anotação). */
  formClassName?: string
}

/** Lixeira que pergunta antes de apagar: o 1º clique mostra "Remover" e "Voltar", o 2º apaga. */
export function RemoveIconButton({ action, hidden, label, className, formClassName }: RemoveIconButtonProps) {
  const { armed, arm, disarm, hold } = useArmed()

  return (
    <form action={action} onSubmit={hold} className={cn('inline-flex items-center gap-1.5', formClassName)}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {armed ? (
        <>
          <PlainSubmit className="sn-btn sn-btn-sm sn-btn-danger" ariaLabel={label} pendingLabel="Removendo…">Remover</PlainSubmit>
          <button type="button" onClick={disarm} className="sn-btn sn-btn-sm sn-btn-ghost">Voltar</button>
        </>
      ) : (
        <button type="button" onClick={arm} className={className} aria-label={label} title={label}>
          <IconTrash />
        </button>
      )}
    </form>
  )
}
