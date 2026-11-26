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
  buttonClassName,
}: {
  action: Action
  hidden: Record<string, string>
  label?: string
  confirmText?: string
  className?: string
  /** Substitui o estilo padrão do botão (ex.: item do menu "⋯"). */
  buttonClassName?: string
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

  const baseClass = buttonClassName ?? cn(
    'sn-btn sn-btn-sm sn-btn-danger',
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
            className="sn-btn sn-btn-sm sn-btn-ghost"
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
