'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

// Auto-desarma o estado "confirmar?" se o usuário não agir.
const DISARM_MS = 4000

export function DeleteButton({
  action,
  hidden,
  label = 'Excluir',
  confirmText = 'Tem certeza? Esta ação não pode ser desfeita.',
  className,
}: {
  action: Action
  hidden: Record<string, string>
  label?: string
  confirmText?: string
  className?: string
}) {
  // Confirmação em duas etapas inline (sem window.confirm): 1º clique arma, 2º envia.
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
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 active:bg-red-100',
    className,
  )

  return (
    <form action={action} className="inline-flex items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {armed ? (
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
