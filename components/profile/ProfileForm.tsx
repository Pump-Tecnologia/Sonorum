'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
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
        <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm font-medium text-accent-800">
          Perfil atualizado!
        </p>
      )}
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <Field label="Nome" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" defaultValue={user.name} required />
      </Field>

      <Field label="E-mail" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" defaultValue={user.email} required />
      </Field>

      <Field label="Telefone" htmlFor="phone" error={fe.phone}>
        <Input id="phone" name="phone" defaultValue={user.phone ?? ''} />
      </Field>

      <SubmitButton pendingLabel="Salvando…">Salvar perfil</SubmitButton>
    </form>
  )
}
