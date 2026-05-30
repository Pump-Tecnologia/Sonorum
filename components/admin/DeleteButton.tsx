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
          'rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50',
          className,
        )}
      >
        {label}
      </button>
    </form>
  )
}
