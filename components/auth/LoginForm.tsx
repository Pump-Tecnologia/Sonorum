'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AuthField, AuthInput } from '@/components/auth/AuthField'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import styles from '@/components/auth/auth.module.css'
import { signIn } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className={styles.form}>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && <p className={styles.alert}>{state.error}</p>}

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

      <AuthField label="Senha" htmlFor="password" error={fe.password}>
        <AuthInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(fe.password)}
          required
        />
      </AuthField>

      <div className={styles.forgotRow}>
        <Link href="/forgot-password" className={styles.linkInline}>
          Esqueci minha senha
        </Link>
      </div>

      <AuthSubmit pendingLabel="Entrando…">Entrar</AuthSubmit>

      <p className={styles.footerLine}>
        Ainda não tem conta? <Link href="/register">Criar conta</Link>
      </p>
    </form>
  )
}
