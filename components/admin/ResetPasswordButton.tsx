'use client'

import { useActionState } from 'react'

import { resetUserPassword, type ResetPasswordState } from '@/lib/actions/credentials'

const initial: ResetPasswordState = { ok: false }

// Envia um link de uso único para o usuário definir uma nova senha.
export function ResetPasswordButton({ userId, userName, className }: { userId: string; userName: string; className?: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, initial)

  return (
    <form
      action={action}
      className={className ? 'flex flex-col' : 'inline-flex items-center gap-1.5'}
      onSubmit={(e) => {
        if (!confirm(`Enviar um link de redefinição de senha para ${userName}?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        title="Envia um link de redefinição de senha ao usuário"
        className={className ?? 'text-xs font-medium text-ink-muted transition-colors hover:text-brand-600 disabled:cursor-wait disabled:opacity-60'}
      >
        {pending ? 'Enviando…' : 'Redefinir senha'}
      </button>
      {state.ok && <span className={className ? 'px-3 pb-2 text-xs font-medium text-accent-700' : 'text-xs font-medium text-accent-700'}>link enviado ✓</span>}
      {state.error && <span className={className ? 'px-3 pb-2 text-xs font-medium text-red-600' : 'text-xs font-medium text-red-600'}>{state.error}</span>}
    </form>
  )
}
