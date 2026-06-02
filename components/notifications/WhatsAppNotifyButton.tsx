'use client'

import { useActionState, useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'
import type { NotifyActionState } from '@/lib/actions/notifications'

const initial: NotifyActionState = { ok: false }

type Action = (prev: NotifyActionState, formData: FormData) => Promise<NotifyActionState>

interface Props {
  action: Action
  hidden: Record<string, string>
  label?: string
  className?: string
  title?: string
}

// Submete a server action e, ao receber whatsappLinks, abre cada link em uma
// nova aba (WhatsApp Web/App). O envio do log fica no servidor.
export function WhatsAppNotifyButton({ action, hidden, label = 'Lembrar via WhatsApp', className, title }: Props) {
  const [state, formAction, pending] = useActionState(action, initial)
  const lastHandled = useRef<NotifyActionState | null>(null)

  useEffect(() => {
    if (state === lastHandled.current) return
    lastHandled.current = state
    if (state.ok && state.whatsappLinks?.length) {
      for (const l of state.whatsappLinks) window.open(l.url, '_blank', 'noopener,noreferrer')
    }
  }, [state])

  return (
    <form action={formAction} className="inline-flex">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        title={title ?? label}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60',
          className,
        )}
      >
        {/* WhatsApp icon (24x24 simplified) */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3ZM12 3a9 9 0 0 0-7.6 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.6.7.7-2.6-.2-.3a7.3 7.3 0 1 1 6.1 3.4Z" />
        </svg>
        {pending ? 'Enviando…' : label}
      </button>
      {state.error && <span className="ml-2 text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  )
}
