'use client'

import { cn } from '@/lib/cn'

type Action = (formData: FormData) => void | Promise<void>

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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault()
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 active:bg-red-100',
          className,
        )}
      >
        {label}
      </button>
    </form>
  )
}
