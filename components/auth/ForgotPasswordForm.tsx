'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AuthField, AuthInput } from '@/components/auth/AuthField'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import styles from '@/components/auth/auth.module.css'
import { requestPasswordReset } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok) {
    return (
      <div className={styles.form}>
        <p className={styles.success}>
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
        </p>
        <Link href="/login" className={styles.backLink}>
          ← Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className={styles.form}>
      <AuthField label="E-mail" htmlFor="email" error={fe.email}>
        <AuthInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          invalid={Boolean(fe.email)}
          required
        />
      </AuthField>

      <AuthSubmit pendingLabel="Enviando…">Enviar link de redefinição</AuthSubmit>

      <p className={styles.footerLine}>
        <Link href="/login">Voltar ao login</Link>
      </p>
    </form>
  )
}
