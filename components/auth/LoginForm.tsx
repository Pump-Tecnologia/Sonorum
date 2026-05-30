'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input } from '@/components/ui/Field'
import { signIn } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initial)

  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Senha" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Esqueci minha senha
        </Link>
      </div>

      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        Ainda não tem conta?{' '}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
