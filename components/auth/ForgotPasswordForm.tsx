'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Field, Input } from '@/components/ui/Field'
import { requestPasswordReset } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'

const initial: ActionState = { ok: false }

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial)

  if (state.ok) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm font-medium text-accent-800">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.
        </p>
        <Link href="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
          ← Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton pendingLabel="Enviando…">Enviar link de redefinição</SubmitButton>
      <p className="text-center">
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Voltar ao login
        </Link>
      </p>
    </form>
  )
}
