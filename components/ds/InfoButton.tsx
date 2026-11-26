'use client'

import { useCallback, useId, useRef, useState } from 'react'

import { IconInfo } from '@/components/ds/icons'
import styles from '@/components/ds/ds.module.css'
import { useDismiss } from '@/components/ds/useDismiss'
import { cn } from '@/lib/cn'

interface InfoButtonProps {
  /** Nome acessível do botão, ex.: "Como funcionam os modelos". */
  label: string
  children: React.ReactNode
  /** Para que lado o balão abre. 'end' encosta na direita (botão perto da borda direita). */
  align?: 'start' | 'end'
  className?: string
}

/**
 * Botão "i". Texto de apoio da tela nunca fica solto: vai aqui dentro e só
 * aparece quando a pessoa pede. Fecha com Esc e clique fora.
 */
export function InfoButton({ label, children, align = 'start', className }: InfoButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const bubbleId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <span ref={ref} className={cn(styles.info, className)}>
      <button
        type="button"
        className={styles.infoTrigger}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={bubbleId}
        onClick={() => setOpen((value) => !value)}
      >
        <IconInfo />
      </button>
      {open && (
        <span id={bubbleId} role="note" className={cn(styles.infoBubble, align === 'end' && styles.infoBubbleEnd)}>
          {children}
        </span>
      )}
    </span>
  )
}
