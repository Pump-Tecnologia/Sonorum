'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { Field, Input } from '@/components/ui/Field'
import { updateOwnPassword, type ProfileActionState } from '@/lib/actions/profile'

const initial: ProfileActionState = { ok: false }

export function PasswordForm() {
  const [state, action] = useActionState(updateOwnPassword, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      {state.ok && (
        <p className="sn-notice-ok" role="status">
          Senha atualizada!
        </p>
      )}
      {state.error && (
        <p className="sn-alert" role="alert">{state.error}</p>
      )}

      <Field label="Senha atual" htmlFor="currentPassword" error={fe.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>

      <Field label="Nova senha" htmlFor="newPassword" error={fe.newPassword} hint="Mínimo de 8 caracteres">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>

      <Field label="Confirmar nova senha" htmlFor="confirmation" error={fe.confirmation}>
        <Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Salvando…">Alterar senha</SubmitButton>
    </form>
  )
}
