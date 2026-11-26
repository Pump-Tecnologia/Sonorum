'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'

import { cn } from '@/lib/cn'
import { formatBRL } from '@/lib/format'

const STORAGE_KEY = 'sonorum.finance.hidden'
const STORAGE_EVENT = 'sonorum:finance-visibility'
let hiddenSnapshot = true

function subscribeVisibility(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(STORAGE_EVENT, callback)
  }
}

function getVisibilitySnapshot() {
  try {
    hiddenSnapshot = window.localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    // Mantém a última escolha em memória quando o navegador bloqueia storage.
  }
  return hiddenSnapshot
}

function getVisibilityServerSnapshot() {
  return true
}

interface Ctx {
  hidden: boolean
  toggle: () => void
}

const FinanceVisibilityContext = createContext<Ctx | null>(null)

// Default OCULTO (padrão Nubank/banco). Persiste a escolha em localStorage para
// preservar entre navegações. Provider vive no shell da área autenticada.
export function FinanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot,
  )

  const toggle = () => {
    hiddenSnapshot = !hidden
    try {
      window.localStorage.setItem(STORAGE_KEY, String(hiddenSnapshot))
    } catch {
      // A escolha continua funcional durante a sessão mesmo sem persistência.
    }
    window.dispatchEvent(new Event(STORAGE_EVENT))
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
        'inline-grid h-10 w-10 place-items-center rounded-full bg-(--sn-mint-soft) text-(--sn-ink-soft) transition-colors hover:bg-(--sn-mint-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sn-green)',
        className,
      )}
    >
      {hidden ? EyeClosed : EyeOpen}
    </button>
  )
}
