'use client'

import { useState } from 'react'

import { Button, SubmitButton } from '@/components/ds/Button'
import { Field, Input } from '@/components/ui/Field'
import { deleteOwnAccount } from '@/lib/actions/profile'

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return <Button variant="danger" onClick={() => setConfirming(true)}>Excluir minha conta</Button>
  }

  return (
    <form action={deleteOwnAccount} className="space-y-3 rounded-(--sn-radius-lg) bg-(--sn-danger-soft) p-4">
      <p className="m-0 text-[15px] font-medium text-(--sn-danger)">
        Não dá para desfazer. Confirme sua senha para excluir a conta.
      </p>
      <Field label="Senha" htmlFor="del-pwd">
        <Input id="del-pwd" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingLabel="Excluindo…">Excluir conta</SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
