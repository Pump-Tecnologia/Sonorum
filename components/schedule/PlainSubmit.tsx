'use client'

import { useFormStatus } from 'react-dom'

interface PlainSubmitProps {
  className: string
  children: React.ReactNode
  pendingLabel?: string
}

/** Envio com estado de espera para botões com visual próprio (ex.: cartão escuro da aula em andamento). */
export function PlainSubmit({ className, children, pendingLabel = 'Aguarde…' }: PlainSubmitProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}
