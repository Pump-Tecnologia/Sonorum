'use client'

import { useState } from 'react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

// Botão "copiar" para o PIX copia-e-cola. Feedback efêmero ao copiar.
export function CopyButton({ value, label = 'Copiar', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        'sn-btn sn-btn-primary'
      }
      aria-live="polite"
    >
      {copied ? 'Copiado' : label}
    </button>
  )
}
