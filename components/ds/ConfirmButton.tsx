'use client'

import { useState } from 'react'

import { Button, SubmitButton, type ButtonSize, type ButtonVariant } from '@/components/ds/Button'
import styles from '@/components/ds/ds.module.css'

type Action = (formData: FormData) => void | Promise<void>

interface ConfirmButtonProps {
  action: Action
  /** Campos escondidos enviados com a action (ex.: { lessonId }). */
  hidden: Record<string, string>
  label: string
  /** Pergunta que aparece no segundo passo, ex.: "Cancelar as próximas 12 aulas?". */
  question: string
  confirmLabel?: string
  pendingLabel?: string
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Ação que não dá para desfazer: o 1º clique pergunta, o 2º envia. */
export function ConfirmButton({
  action,
  hidden,
  label,
  question,
  confirmLabel = 'Confirmar',
  pendingLabel = 'Aguarde…',
  variant = 'danger',
  size = 'sm',
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  return (
    <form action={action} className={styles.confirmForm}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {armed ? (
        <span className={styles.confirmRow} role="alert">
          <span>{question}</span>
          <SubmitButton variant="danger" size={size} pendingLabel={pendingLabel}>{confirmLabel}</SubmitButton>
          <Button variant="ghost" size={size} onClick={() => setArmed(false)}>Voltar</Button>
        </span>
      ) : (
        <Button variant={variant} size={size} onClick={() => setArmed(true)}>{label}</Button>
      )}
    </form>
  )
}
