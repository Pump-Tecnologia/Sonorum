'use client'

import { useActionState } from 'react'

import { resetUserPassword, type ResetPasswordState } from '@/lib/actions/credentials'

const initial: ResetPasswordState = { ok: false }

// Redefine a senha do usuário e envia a nova por e-mail (com confirmação).
export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, initial)

  return (
    <form
      action={action}
      className="inline-flex items-center gap-1.5"
      onSubmit={(e) => {
        if (!confirm(`Redefinir a senha de ${userName} e enviar a nova por e-mail?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        title="Gera uma nova senha e envia por e-mail ao usuário"
        className="text-xs font-medium text-ink-muted transition-colors hover:text-brand-600 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Redefinir senha'}
      </button>
      {state.ok && <span className="text-xs font-medium text-accent-700">enviada ✓</span>}
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  )
}
