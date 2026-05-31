'use client'

import { useActionState } from 'react'

import { AuthField, AuthInput } from '@/components/auth/AuthField'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import styles from '@/components/auth/auth.module.css'
import { updatePassword } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className={styles.form}>
      {state.error && <p className={styles.alert}>{state.error}</p>}

      <AuthField label="Nova senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres">
        <AuthInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(fe.password)}
          required
        />
      </AuthField>

      <AuthField label="Confirmar nova senha" htmlFor="passwordConfirmation" error={fe.passwordConfirmation}>
        <AuthInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(fe.passwordConfirmation)}
          required
        />
      </AuthField>

      <AuthSubmit pendingLabel="Salvando…">Redefinir senha</AuthSubmit>
    </form>
  )
}
