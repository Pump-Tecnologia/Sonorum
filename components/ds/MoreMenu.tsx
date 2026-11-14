'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { IconMore } from '@/components/ds/icons'
import styles from '@/components/ds/ds.module.css'
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

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
