'use client'

import { useFormStatus } from 'react-dom'

interface PlainSubmitProps {
  className: string
  children: React.ReactNode
  pendingLabel?: string
  /** Nome acessível quando o texto visível não basta (ex.: "Confirmar" de uma exclusão). */
  ariaLabel?: string
}

/** Envio com estado de espera para botões com visual próprio (cartão escuro da aula, itens de menu). */
export function PlainSubmit({ className, children, pendingLabel = 'Aguarde…', ariaLabel }: PlainSubmitProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} aria-label={ariaLabel}>
      {pending ? pendingLabel : children}
    </button>
  )
}
