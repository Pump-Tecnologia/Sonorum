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
        'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700'
      }
      aria-live="polite"
    >
      {copied ? 'Copiado ✓' : label}
    </button>
  )
}
