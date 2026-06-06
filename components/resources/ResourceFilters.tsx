'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CATEGORIES, DIFFICULTIES, INST_CATEGORIES } from '@/lib/constants/resources'

const SELECT_CLS = 'rounded-xl border border-hairline bg-surface px-3 py-2 text-sm focus:outline-2 focus:outline-brand-500'

// Filtros da biblioteca de recursos. Estado vive na URL (compartilhável,
// filtragem no servidor). Busca é debounced; selects aplicam na hora.
export function ResourceFilters({
  q,
  cat,
  inst,
  diff,
  view,
}: {
  q: string
  cat: string
  inst: string
  diff: string
  view: 'grid' | 'list'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [search, setSearch] = useState(q)
  const first = useRef(true)

  function withParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    return params
  }
  function setParam(key: string, value: string) {
    router.replace(`${pathname}?${withParam(key, value).toString()}`)
  }

  // Debounce da busca textual.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => setParam('q', search.trim()), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hasFilters = Boolean(q || cat || inst || diff)

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por título, descrição ou instrumento…"
        aria-label="Buscar recursos"
        className={`${SELECT_CLS} min-w-[220px] flex-1`}
      />
      <select value={cat} onChange={(e) => setParam('category', e.target.value)} aria-label="Categoria" className={SELECT_CLS}>
        <option value="">Categoria</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={inst} onChange={(e) => setParam('instrument', e.target.value)} aria-label="Instrumento" className={SELECT_CLS}>
        <option value="">Instrumento</option>
        {INST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={diff} onChange={(e) => setParam('difficulty', e.target.value)} aria-label="Dificuldade" className={SELECT_CLS}>
        <option value="">Dificuldade</option>
        {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="rounded-xl px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Limpar
        </button>
      )}

      <div className="ml-auto inline-flex overflow-hidden rounded-xl border border-hairline">
        {(['grid', 'list'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setParam('view', v === 'grid' ? '' : v)}
            aria-pressed={view === v}
            className={`px-3 py-2 text-sm font-medium ${view === v ? 'bg-brand-600 text-white' : 'bg-surface text-ink-muted hover:bg-surface-muted'}`}
          >
            {v === 'grid' ? 'Grade' : 'Lista'}
          </button>
        ))}
      </div>
    </div>
  )
}
