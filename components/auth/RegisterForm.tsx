'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AuthField, AuthInput } from '@/components/auth/AuthField'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import styles from '@/components/auth/auth.module.css'
import { signUp } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className={styles.form}>
      {state.error && <p className={styles.alert}>{state.error}</p>}

      <AuthField label="Nome da escola" htmlFor="schoolName" error={fe.schoolName}>
        <AuthInput
          id="schoolName"
          name="schoolName"
          autoComplete="organization"
          placeholder="Ex.: Escola Tom Maior"
          invalid={Boolean(fe.schoolName)}
          required
        />
      </AuthField>

      <AuthField label="Seu nome" htmlFor="name" error={fe.name}>
        <AuthInput
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Como devemos te chamar?"
          invalid={Boolean(fe.name)}
          required
        />
      </AuthField>

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

      <AuthField label="Senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres">
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

      <AuthSubmit pendingLabel="Criando…">Criar conta grátis</AuthSubmit>

      <p className={styles.footerLine}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  )
}
