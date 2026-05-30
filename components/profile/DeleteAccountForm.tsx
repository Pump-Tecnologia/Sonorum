'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { deleteOwnAccount } from '@/lib/actions/profile'

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)} className="text-red-600">
        Excluir minha conta
      </Button>
    )
  }

  return (
    <form action={deleteOwnAccount} className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
      <p className="text-sm font-medium text-red-800">
        Esta ação não pode ser desfeita. Confirme sua senha para excluir a conta.
      </p>
      <Field label="Senha" htmlFor="del-pwd">
        <Input id="del-pwd" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Excluir conta permanentemente
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
