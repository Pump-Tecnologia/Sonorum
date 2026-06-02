'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface PlannerTab {
  id: string
  label: string
  hint?: string
  /** Conteúdo renderizado no server (forms + server actions) e passado como slot. */
  content: ReactNode
}

// Abas por fase da aula (Planejar / Dar aula / Avaliar). O componente só
// controla qual painel está visível; o conteúdo vem pronto do server.
export function PlannerTabs({ tabs, defaultTab }: { tabs: PlannerTab[]; defaultTab: string }) {
  const [active, setActive] = useState(() => (tabs.some((t) => t.id === defaultTab) ? defaultTab : tabs[0]?.id))
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div>
      <div
        role="tablist"
        aria-label="Fases da aula"
        className="mb-6 inline-flex w-full gap-1 rounded-2xl border border-hairline bg-surface-muted p-1 sm:w-auto"
      >
        {tabs.map((t) => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
                selected
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {current?.hint && (
        <p className="-mt-3 mb-5 text-sm text-ink-muted">{current.hint}</p>
      )}

      <div role="tabpanel">{current?.content}</div>
    </div>
  )
}
