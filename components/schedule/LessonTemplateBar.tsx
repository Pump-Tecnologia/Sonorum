'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { applyTemplateToLesson, saveLessonAsTemplate } from '@/lib/actions/lesson-templates'

export interface TemplateOption {
  id: string
  name: string
  instrument_category: string | null
  instrument: string | null
}

const GHOST_BTN = 'rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted disabled:opacity-50'
const INPUT_CLS = 'rounded-xl border border-hairline bg-surface px-3 py-1.5 text-sm focus:outline-2 focus:outline-brand-500'

// Barra de modelos no topo do "Planejar": aplicar um modelo (pré-preenche o
// plano) ou salvar o plano atual como modelo. Aplicar SUBSTITUI o texto do
// plano. Como os campos do editor são não-controlados (defaultValue),
// recarregamos a página para repopular — router.refresh() não atualizaria os
// inputs já montados. Por isso o aviso explícito antes de aplicar.
export function LessonTemplateBar({
  lessonId,
  templates,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  templates: TemplateOption[]
  instrumentCategory: string | null
  instrument: string | null
}) {
  const [selected, setSelected] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [applying, startApply] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [savingOpen, setSavingOpen] = useState(false)
  const [name, setName] = useState(instrument ? `Aula de ${instrument}` : '')
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  // Modelos do instrumento/categoria do aluno primeiro.
  const sorted = [...templates].sort((a, b) => {
    const am = a.instrument_category === instrumentCategory ? 0 : 1
    const bm = b.instrument_category === instrumentCategory ? 0 : 1
    return am - bm || a.name.localeCompare(b.name)
  })

  function apply() {
    setError(null)
    startApply(async () => {
      const res = await applyTemplateToLesson({ lessonId, templateId: selected })
      if (res.ok) window.location.reload()
      else {
        setError(res.error ?? 'Não foi possível aplicar.')
        setConfirming(false)
      }
    })
  }

  function save() {
    setError(null)
    setSaved(false)
    startSave(async () => {
      const res = await saveLessonAsTemplate({ lessonId, name })
      if (res.ok) {
        setSaved(true)
        setSavingOpen(false)
      } else setError(res.error ?? 'Não foi possível salvar.')
    })
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {templates.length > 0 ? (
          <>
            <select
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setConfirming(false) }}
              className={INPUT_CLS}
              aria-label="Modelo de aula"
            >
              <option value="">Aplicar um modelo…</option>
              {sorted.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.instrument ? ` · ${t.instrument}` : t.instrument_category ? ` · ${t.instrument_category}` : ''}
                </option>
              ))}
            </select>
            {selected && !confirming && (
              <button type="button" onClick={() => setConfirming(true)} disabled={applying} className={GHOST_BTN}>
                Aplicar
              </button>
            )}
            {selected && confirming && (
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-ink-muted">Substitui o plano e descarta alterações não salvas.</span>
                <button type="button" onClick={apply} disabled={applying} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                  {applying ? 'Aplicando…' : 'Confirmar'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="text-xs font-medium text-ink-muted hover:text-ink">cancelar</button>
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-ink-muted">Nenhum modelo ainda.</span>
        )}

        <span className="mx-1 hidden h-4 w-px bg-hairline sm:inline-block" />

        {!savingOpen ? (
          <button type="button" onClick={() => { setSavingOpen(true); setSaved(false) }} className={GHOST_BTN}>
            Salvar como modelo
          </button>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do modelo" className={INPUT_CLS} autoFocus />
            <button type="button" onClick={save} disabled={saving || !name.trim()} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setSavingOpen(false)} className="text-xs font-medium text-ink-muted hover:text-ink">cancelar</button>
          </span>
        )}

        {saved && <span className="text-xs font-medium text-accent-700">Modelo salvo ✓</span>}

        <Link href="/modelos" className="ml-auto text-xs font-semibold text-brand-600 hover:underline">
          Gerenciar modelos →
        </Link>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <p className="mt-1.5 text-[11px] text-ink-muted">Salvar como modelo usa o planejamento já salvo (objetivos, aquecimento, repertório, tarefa e BPM) — salve o plano antes.</p>
    </div>
  )
}
