'use client'

import { useActionState } from 'react'

import { useArmed } from '@/components/ds/useArmed'
import { resetUserPassword, type ResetPasswordState } from '@/lib/actions/credentials'

const initial: ResetPasswordState = { ok: false }

// Envia um link de uso único para o usuário definir uma nova senha.
// Confirmação em duas etapas na própria linha (sem a caixa do navegador): 1º clique pergunta, 2º envia.
export function ResetPasswordButton({ userId, userName, className }: { userId: string; userName: string; className?: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, initial)
  const { armed, arm, disarm } = useArmed()

  const inMenu = Boolean(className)
  const buttonClass = className ?? 'sn-btn sn-btn-sm sn-btn-ghost'
  const question = `Enviar o link de nova senha para ${userName}?`

  return (
    <form
      action={action}
      onSubmit={disarm}
      className={inMenu ? 'flex flex-col' : 'inline-flex flex-wrap items-center gap-1.5'}
    >
      <input type="hidden" name="userId" value={userId} />
      {armed ? (
        <>
          <span className={inMenu ? 'px-3 pt-2 pb-1 text-[13px] text-[var(--sn-text-muted)]' : 'text-[13px] text-[var(--sn-text-muted)]'}>
            {question}
          </span>
          <button type="submit" className={buttonClass} aria-label={question}>Enviar link</button>
          <button type="button" onClick={disarm} className={buttonClass}>Voltar</button>
        </>
      ) : (
        <button type="button" onClick={arm} disabled={pending} className={buttonClass}>
          {pending ? 'Enviando…' : 'Redefinir senha'}
        </button>
      )}
      {state.ok && !pending && <span className={inMenu ? 'px-3 pb-2 text-[13px] text-(--sn-success)' : 'text-[13px] text-(--sn-success)'} role="status">Link enviado</span>}
      {state.error && !pending && <span className={inMenu ? 'sn-error px-3 pb-2' : 'sn-error'} role="alert">{state.error}</span>}
    </form>
  )
}
