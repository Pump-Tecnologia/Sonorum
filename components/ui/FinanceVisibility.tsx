'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { formatBRL } from '@/lib/format'

const STORAGE_KEY = 'sonorum.finance.hidden'

interface Ctx {
  hidden: boolean
  toggle: () => void
}

const FinanceVisibilityContext = createContext<Ctx | null>(null)

// Default OCULTO (padrão Nubank/banco). Persiste a escolha em localStorage para
// preservar entre navegações. Provider vive no shell da área autenticada.
export function FinanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'false') setHidden(false)
    } catch {
      // localStorage indisponível (modo privado, SSR) — segue com default oculto.
    }
  }, [])

  const toggle = () => {
    setHidden((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignora
      }
      return next
    })
  }

  return <FinanceVisibilityContext.Provider value={{ hidden, toggle }}>{children}</FinanceVisibilityContext.Provider>
}

function useFinanceVisibility(): Ctx {
  // Fora do provider, comporta-se como sempre visível (não bloqueia render).
  return useContext(FinanceVisibilityContext) ?? { hidden: false, toggle: () => {} }
}

const HIDDEN_MASK = 'R$ •••••'

// Valor monetário que respeita o estado global de visibilidade. Use no lugar
// de formatBRL(n) sempre que mostrar dinheiro do usuário.
export function MoneyValue({ value, className }: { value: number; className?: string }) {
  const { hidden } = useFinanceVisibility()
  return <span className={cn(hidden && 'tracking-wide', className)}>{hidden ? HIDDEN_MASK : formatBRL(value)}</span>
}

const EyeOpen = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosed = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 3 18 18" />
    <path d="M10.7 5.1c.4-.07.9-.1 1.3-.1 6.5 0 10 7 10 7a17.7 17.7 0 0 1-2.8 3.5" />
    <path d="M6.1 6.1A18.2 18.2 0 0 0 2 12s3.5 7 10 7c2 0 3.6-.5 5-1.3" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

// Botão olho — coloque no header das páginas financeiras.
export function FinanceToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useFinanceVisibility()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted transition-colors hover:border-brand-300 hover:text-ink',
        className,
      )}
    >
      {hidden ? EyeClosed : EyeOpen}
    </button>
  )
}
