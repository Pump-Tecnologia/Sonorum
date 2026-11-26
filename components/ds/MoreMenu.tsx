'use client'

import { useCallback, useId, useRef, useState } from 'react'

import { IconMore } from '@/components/ds/icons'
import styles from '@/components/ds/ds.module.css'
import { useDismiss } from '@/components/ds/useDismiss'
import { cn } from '@/lib/cn'

interface MoreMenuProps {
  /** Nome acessível do botão, ex.: "Mais ações para Helena Prado". */
  label: string
  children: React.ReactNode
  className?: string
}

/** Botão redondo "⋯" que abre ações secundárias. Fecha com Esc e clique fora. */
export function MoreMenu({ label, children, className }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div ref={ref} className={cn(styles.more, className)}>
      <button
        type="button"
        className={styles.moreTrigger}
        aria-label={label}
        title={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <IconMore />
      </button>
      {open && (
        <div id={menuId} className={styles.moreMenu}>
          {children}
        </div>
      )}
    </div>
  )
}
