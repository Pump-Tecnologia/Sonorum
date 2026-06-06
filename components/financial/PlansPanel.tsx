'use client'

import { useEffect, useState } from 'react'

import { CreatePlanForm, type Plan } from '@/components/financial/PlanForm'
import { PlansList } from '@/components/financial/PlansList'
import { Button } from '@/components/ui/Button'

interface StudentOption {
  id: string
  name: string
}

// Lista em largura cheia + criação de plano num modal (em vez de coluna fixa).
export function PlansPanel({ plans, counts, students }: { plans: Plan[]; counts: Record<string, number>; students: StudentOption[] }) {
  const [creating, setCreating] = useState(false)

  // Fecha com Esc; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!creating) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreating(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [creating])

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Planos cadastrados</h2>
        <Button onClick={() => setCreating(true)}>+ Novo plano</Button>
      </div>

      <PlansList plans={plans} counts={counts} students={students} />

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setCreating(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Novo plano"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-hairline bg-surface p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Novo plano</h2>
              <button
                type="button"
                onClick={() => setCreating(false)}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreatePlanForm onSuccess={() => setCreating(false)} />
          </div>
        </div>
      )}
    </>
  )
}
