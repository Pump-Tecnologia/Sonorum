'use client'

import { PlainSubmit } from '@/components/ds/PlainSubmit'
import { useArmed } from '@/components/ds/useArmed'
import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

// Botão de ação com confirmação opcional (estilo neutro, ao contrário do DeleteButton vermelho).
export function RestoreButton({
  action,
  hidden,
  label = 'Restaurar',
  confirmText,
  pendingLabel = 'Restaurando…',
  className,
  buttonClassName,
}: {
  action: Action
  hidden: Record<string, string>
  label?: string
  confirmText?: string
  pendingLabel?: string
  className?: string
  /** Substitui o estilo padrão do botão (ex.: item do menu "⋯"). */
  buttonClassName?: string
}) {
  // Sem confirmText: envia direto. Com confirmText: duas etapas inline (sem window.confirm).
  const { armed, arm, disarm, hold } = useArmed()

  const baseClass = buttonClassName ?? cn('sn-btn sn-btn-sm sn-btn-secondary', className)

  return (
    <form action={action} onSubmit={hold} className="inline-flex items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {!confirmText ? (
        <PlainSubmit className={baseClass} pendingLabel={pendingLabel}>{label}</PlainSubmit>
      ) : armed ? (
        <>
          <PlainSubmit className={baseClass} ariaLabel={confirmText} pendingLabel={pendingLabel}>Confirmar</PlainSubmit>
          <button type="button" onClick={disarm} className="sn-btn sn-btn-sm sn-btn-ghost">Voltar</button>
        </>
      ) : (
        <button type="button" onClick={arm} className={baseClass}>
          {label}
        </button>
      )}
    </form>
  )
}
