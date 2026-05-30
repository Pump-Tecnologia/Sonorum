'use client'

import { useState, useTransition } from 'react'

import { attachResource } from '@/lib/actions/lessons'

interface SearchResult {
  id: string
  title: string
  category: string
  instrument: string | null
  difficulty: string
}

const SECTIONS = [
  { value: 'warmup', label: 'Aquecimento' },
  { value: 'repertoire', label: 'Repertório' },
  { value: 'homework', label: 'Tarefa de casa' },
  { value: 'general', label: 'Geral' },
]

export function ResourcePicker({ lessonId }: { lessonId: string }) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('general')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [pending, startTransition] = useTransition()

  async function search(q: string) {
    setSearching(true)
    const res = await fetch(`/api/resources?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setSearching(false)
  }

  function handleAttach(resourceId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lessonId', lessonId)
      fd.set('resourceId', resourceId)
      fd.set('section', section)
      await attachResource(fd)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) search(e.target.value)
            else setResults([])
          }}
          placeholder="Buscar recurso por título ou instrumento…"
          className="flex-1 rounded-xl border border-hairline bg-surface px-3.5 py-2 text-sm focus:outline-2 focus:outline-brand-500"
        />
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm"
        >
          {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {searching && <p className="text-xs text-ink-muted">Buscando…</p>}

      {results.length > 0 && (
        <ul className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-hairline">
          {results.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-muted/50"
            >
              <div>
                <p className="font-medium text-ink">{r.title}</p>
                <p className="text-xs text-ink-muted">
                  {r.category} · {r.difficulty}
                  {r.instrument && ` · ${r.instrument}`}
                </p>
              </div>
              <button
                onClick={() => handleAttach(r.id)}
                disabled={pending}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                + Anexar
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-ink-muted">Nenhum recurso encontrado.</p>
      )}
    </div>
  )
}
