'use client'

import { useEffect, useId, useRef } from 'react'

import { IconButton } from '@/components/ds/Button'
import { IconClose } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import styles from '@/components/ds/ds.module.css'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** Título visível; vira o nome acessível da janela. */
  title: React.ReactNode
  /** Dado curto sob o título (nome, data). Explicação vai em `info`. */
  subtitle?: React.ReactNode
  /** Explicação da janela, dentro do botão "i" ao lado do título. */
  info?: React.ReactNode
  size?: 'md' | 'sm'
  children: React.ReactNode
}

/**
 * Janela modal sobre o <dialog> nativo: foco preso dentro, Esc fecha e o
 * clique fora (no fundo) também fecha.
 */
export function Dialog({ open, onClose, title, subtitle, info, size = 'md', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  // O clique no fundo chega com o próprio <dialog> como alvo.
  function handleClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(styles.dialog, size === 'sm' && styles.dialogSmall)}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      {open && (
        <div className={styles.dialogBody}>
          <header className={styles.dialogHeader}>
            <div>
              <div className={styles.dialogTitleRow}>
                <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
                {info && <InfoButton label={typeof title === 'string' ? `Sobre ${title}` : 'Sobre esta janela'}>{info}</InfoButton>}
              </div>
              {subtitle && <p className={styles.dialogSubtitle}>{subtitle}</p>}
            </div>
            <IconButton label="Fechar" quiet onClick={onClose}><IconClose /></IconButton>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className={styles.dialogFooter}>{children}</div>
}
