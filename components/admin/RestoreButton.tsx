'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

// Auto-desarma o estado "confirmar?" se o usuário não agir.
const DISARM_MS = 4000

// Botão de ação com confirmação opcional (estilo neutro, ao contrário do DeleteButton vermelho).
export function RestoreButton({
  action,
  hidden,
  label = 'Restaurar',
  confirmText,
  className,
}: {
  action: Action
  hidden: Record<string, string>
  label?: string
  confirmText?: string
  className?: string
}) {
  // Sem confirmText: envia direto. Com confirmText: duas etapas inline (sem window.confirm).
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function arm() {
    setArmed(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), DISARM_MS)
  }
  function disarm() {
    if (timer.current) clearTimeout(timer.current)
    setArmed(false)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const baseClass = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted',
    className,
  )

  return (
    <form action={action} className="inline-flex items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {!confirmText ? (
        <button type="submit" className={baseClass}>
          {label}
        </button>
      ) : armed ? (
        <>
          <button type="submit" aria-label={confirmText} className={baseClass}>
            Confirmar
          </button>
          <button
            type="button"
            onClick={disarm}
            className="inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            Voltar
          </button>
        </>
      ) : (
        <button type="button" onClick={arm} className={baseClass}>
          {label}
        </button>
      )}
    </form>
  )
}
