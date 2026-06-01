'use client'

import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

// Botão de ação com confirmação (estilo neutro, ao contrário do DeleteButton vermelho).
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault()
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className={cn('rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50', className)}
      >
        {label}
      </button>
    </form>
  )
}
