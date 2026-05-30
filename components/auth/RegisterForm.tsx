'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input } from '@/components/ui/Field'
import { signUp } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <Field label="Nome da escola" htmlFor="schoolName" error={fe.schoolName}>
        <Input id="schoolName" name="schoolName" autoComplete="organization" required />
      </Field>

      <Field label="Seu nome" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>

      <Field label="E-mail" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <Field
        label="Confirmar senha"
        htmlFor="passwordConfirmation"
        error={fe.passwordConfirmation}
      >
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Criando…">Criar conta grátis</SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </form>
  )
}
