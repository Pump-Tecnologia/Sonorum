'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { Field, Input } from '@/components/ui/Field'
import { updateProfile, type ProfileActionState } from '@/lib/actions/profile'

const initial: ProfileActionState = { ok: false }

interface User { name: string; email: string; phone: string | null }

export function ProfileForm({ user }: { user: User }) {
  const [state, action] = useActionState(updateProfile, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      {state.ok && (
        <p className="sn-notice-ok" role="status">
          Perfil atualizado!
        </p>
      )}
      {state.error && (
        <p className="sn-alert" role="alert">{state.error}</p>
      )}

      <Field label="Nome" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={user.name} required />
      </Field>

      <Field label="E-mail" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={user.email} required />
      </Field>

      <Field label="Telefone" htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={user.phone ?? ''} />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Salvando…">Salvar perfil</SubmitButton>
    </form>
  )
}
