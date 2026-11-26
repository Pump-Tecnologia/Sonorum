'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { IconSearch } from '@/components/ds/icons'
import { SegmentedControl } from '@/components/ds/SegmentedControl'
import { areaMeta } from '@/components/resources/resource-meta'
import styles from '@/components/resources/resources.module.css'
import { cn } from '@/lib/cn'
import { CATEGORIES, DIFFICULTIES } from '@/lib/constants/resources'

const SEARCH_DEBOUNCE_MS = 350

type View = 'shelves' | 'list'

const VIEWS = [
  { value: 'shelves', label: 'Cartões' },
  { value: 'list', label: 'Lista' },
] as const

// Filtros da biblioteca. As abas são as áreas de instrumento (com quantos
// recursos cada uma tem); etapa da aula e nível ficam como filtros extras.
// O estado vive na URL e a busca espera o professor parar de digitar.
export function ResourceFilters({
  q,
  area,
  cat,
  diff,
  view,
  areas,
  total,
}: {
  q: string
  area: string
  cat: string
  diff: string
  view: View
  /** Áreas com recursos e a contagem de cada uma, já com os outros filtros aplicados. */
  areas: Array<{ value: string; count: number }>
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [search, setSearch] = useState(q)
  const first = useRef(true)

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => setParam('q', search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasExtras = Boolean(q || cat || diff)

  return (
    <div className={styles.toolbar}>
      <div className={styles.chips} role="group" aria-label="Instrumento">
        <button type="button" className={cn(styles.chip, styles.chipAll)} aria-pressed={!area} onClick={() => setParam('instrument', '')}>
          Todos <span className={styles.chipCount}>{total}</span>
        </button>
        {areas.map(({ value, count }) => {
          const info = areaMeta(value)
          return (
            <button
              key={value}
              type="button"
              className={cn(styles.chip, styles.tone)}
              data-tone={info.tone}
              aria-pressed={area === value}
              onClick={() => setParam('instrument', area === value ? '' : value)}
            >
              <info.Icon />
              {info.label}
              <span className={styles.chipCount}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.toolbarRow}>
        <label className={styles.search}>
          <IconSearch />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, descrição ou instrumento"
            aria-label="Buscar recursos"
            className={styles.searchInput}
          />
        </label>
        <select value={cat} onChange={(e) => setParam('category', e.target.value)} aria-label="Etapa da aula" className={styles.pillSelect} data-active={Boolean(cat)}>
          <option value="">Todas as etapas</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={diff} onChange={(e) => setParam('difficulty', e.target.value)} aria-label="Nível" className={styles.pillSelect} data-active={Boolean(diff)}>
          <option value="">Todos os níveis</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {hasExtras && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setSearch('')
              const params = new URLSearchParams()
              if (area) params.set('instrument', area)
              if (view === 'list') params.set('view', 'list')
              const qs = params.toString()
              router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
            }}
          >
            Limpar filtros
          </button>
        )}
        <SegmentedControl
          label="Como mostrar os recursos"
          options={VIEWS}
          value={view}
          onChange={(v) => setParam('view', v === 'list' ? 'list' : '')}
          className={styles.viewSwitch}
        />
      </div>
    </div>
  )
}
