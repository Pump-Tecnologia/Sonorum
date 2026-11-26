'use client'

import { useId, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'

import { IconCheck } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import styles from '@/components/schedule/planner.module.css'

export interface PlannerTab {
  id: string
  label: string
  /** Âncora da fase na URL (#planejar, #aula, #avaliar). Links internos usam ela. */
  hash: string
  hint?: string
  /** Fase já cumprida: o número vira um check. */
  done?: boolean
  /** Conteúdo renderizado no server (forms + server actions) e passado como slot. */
  content: ReactNode
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
const readHash = () => window.location.hash.slice(1)
const serverHash = () => ''
// Trocar a âncora dispara hashchange, que atualiza a fase (e o voltar do navegador funciona).
function goToHash(hash: string) { window.location.hash = hash }

// Fases da aula (Planejar, Aula, Avaliar). A fase ativa vem da âncora da URL;
// sem âncora, da fase que o server sugeriu. Todos os painéis ficam montados e
// só os inativos se escondem, para o texto não salvo do plano sobreviver à troca.
export function PlannerTabs({ tabs, defaultTab }: { tabs: PlannerTab[]; defaultTab: string }) {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  const baseId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const current = tabs.find((t) => t.hash === hash) ?? tabs.find((t) => t.id === defaultTab) ?? tabs[0]
  const select = (tab: PlannerTab) => goToHash(tab.hash)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const jump = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (!step && jump === null) return
    event.preventDefault()
    const next = jump ?? (index + step + tabs.length) % tabs.length
    tabRefs.current[next]?.focus()
    select(tabs[next])
  }

  return (
    <>
      <div className={styles.phaseBar}>
        <div role="tablist" aria-label="Fases da aula" className={styles.phases}>
          {tabs.map((t, i) => {
            const selected = t.id === current?.id
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[i] = el }}
                id={`${baseId}-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                data-done={t.done || undefined}
                className={styles.phase}
                onClick={() => select(t)}
                onKeyDown={(event) => onKeyDown(event, i)}
              >
                <span className={styles.phaseNum} aria-hidden="true">
                  {t.done && !selected ? <IconCheck /> : i + 1}
                </span>
                {t.label}
              </button>
            )
          })}
        </div>
        {current?.hint && <InfoButton label={`Sobre a fase ${current.label}`} align="end">{current.hint}</InfoButton>}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${baseId}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== current?.id}
          tabIndex={0}
          className={styles.phasePanel}
        >
          {t.content}
        </div>
      ))}
    </>
  )
}
