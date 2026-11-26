'use client'

import { useEffect, useId, useRef } from 'react'

import { IconButton } from '@/components/ds/Button'
import { IconClose } from '@/components/ds/icons'
import styles from '@/components/ds/ds.module.css'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** Título visível; vira o nome acessível da janela. */
  title: React.ReactNode
  subtitle?: React.ReactNode
  size?: 'md' | 'sm'
  children: React.ReactNode
}

/**
 * Janela modal sobre o <dialog> nativo: foco preso dentro, Esc fecha e o
 * clique fora (no fundo) também fecha.
 */
export function Dialog({ open, onClose, title, subtitle, size = 'md', children }: DialogProps) {
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
              <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
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
