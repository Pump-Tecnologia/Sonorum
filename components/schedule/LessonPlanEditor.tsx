'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'

import { Field, Input, Textarea } from '@/components/ui/Field'
import {
  attachResource,
  createResourceFromLesson,
  detachResource,
  saveLessonPlan,
  type LessonActionState,
} from '@/lib/actions/lessons'
import { CATEGORIES, CONTENT_TYPES } from '@/lib/constants/resources'
import { GENERAL_SECTION, type BlueprintSection, type LessonBlueprint } from '@/lib/constants/lesson-blueprints'
import type { PlanContent } from '@/lib/lesson-plan'

export interface AttachedResource {
  pivotId: string
  section: string
  resourceId: string
  title: string
  category: string
  difficulty: string
  instrument: string | null
}

interface SearchResult {
  id: string
  title: string
  category: string
  instrument: string | null
  instrument_category: string | null
  difficulty: string
}

const PRIMARY_BTN = 'rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60'
const GHOST_BTN = 'rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted disabled:opacity-50'
const INPUT_CLS = 'w-full rounded-xl border border-hairline bg-surface px-3.5 py-2 text-sm focus:outline-2 focus:outline-brand-500'

const initialSave: LessonActionState = { ok: false }

export function LessonPlanEditor({
  lessonId,
  goals,
  blueprint,
  content,
  attached,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  goals: string
  blueprint: LessonBlueprint
  content: PlanContent
  attached: AttachedResource[]
  instrumentCategory: string | null
  instrument: string | null
}) {
  const [state, action, pending] = useActionState(saveLessonPlan, initialSave)

  const blueprintIds = new Set(blueprint.sections.map((s) => s.id))
  const resourcesFor = (id: string) => attached.filter((r) => r.section === id)
  // Recursos avulsos/legados (seção fora do blueprint) caem em "Outros materiais".
  const otherResources = attached.filter((r) => r.section === 'general' || !blueprintIds.has(r.section))

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="blueprintKey" value={blueprint.key} />

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <Field label="Objetivos da aula" htmlFor="goals">
          <Textarea id="goals" name="goals" defaultValue={goals} rows={2} placeholder="O que o aluno deve alcançar nesta aula?" />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {blueprint.sections.map((s) => (
          <SectionEditor
            key={s.id}
            lessonId={lessonId}
            section={s}
            note={content.sections[s.id] ?? ''}
            resources={resourcesFor(s.id)}
            instrumentCategory={instrumentCategory}
            instrument={instrument}
          />
        ))}

        <SectionEditor
          lessonId={lessonId}
          section={GENERAL_SECTION}
          resources={otherResources}
          instrumentCategory={instrumentCategory}
          instrument={instrument}
        />
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5 space-y-4">
          {blueprint.fields.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {blueprint.fields.map((f) => (
                <Field key={f.key} label={`${f.label} (opcional)`} htmlFor={`fld-${f.key}`}>
                  <Input id={`fld-${f.key}`} name={`fld.${f.key}`} defaultValue={content.fields[f.key] ?? ''} placeholder={f.placeholder} />
                </Field>
              ))}
            </div>
          )}
          <Field label="Outras notas do planejamento" htmlFor="plan_notes">
            <Textarea id="plan_notes" name="plan_notes" defaultValue={content.planNotes} rows={2} placeholder="Lembretes, materiais a levar, etc." />
          </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY_BTN}>
          {pending ? 'Salvando…' : 'Salvar planejamento'}
        </button>
        {state.ok && <span className="text-sm font-medium text-accent-700">Salvo ✓</span>}
        {state.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
      </div>
    </form>
  )
}

// Bloco de uma seção: recursos anexados + buscar/anexar + criar da aula + nota.
function SectionEditor({
  lessonId,
  section,
  note,
  resources,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  section: BlueprintSection
  note?: string
  resources: AttachedResource[]
  instrumentCategory: string | null
  instrument: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [picker, setPicker] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  const attachedIds = new Set(resources.map((r) => r.resourceId))

  async function fetchResources(q: string) {
    setSearching(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    else if (instrumentCategory) params.set('category', instrumentCategory)
    const res = await fetch(`/api/resources?${params.toString()}`)
    const data = (await res.json()) as SearchResult[]
    setResults(Array.isArray(data) ? data : [])
    setSearching(false)
  }

  useEffect(() => {
    if (picker && results.length === 0 && !query) void fetchResources('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker])

  function attach(resourceId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lessonId', lessonId)
      fd.set('resourceId', resourceId)
      fd.set('section', section.id)
      await attachResource(fd)
    })
  }

  function detach(pivotId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('pivotId', pivotId)
      fd.set('lessonId', lessonId)
      await detachResource(fd)
    })
  }

  const visibleResults = results.filter((r) => !attachedIds.has(r.id))

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink">{section.label}</h3>
        {section.hint && <p className="text-xs text-ink-muted">{section.hint}</p>}
      </div>

      {resources.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {resources.map((r) => (
            <li key={r.pivotId} className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                <p className="truncate text-xs text-ink-muted">
                  {r.category}
                  {r.instrument ? ` · ${r.instrument}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => detach(r.pivotId)}
                disabled={pending}
                aria-label={`Remover ${r.title} de ${section.label}`}
                className="shrink-0 text-xs font-semibold text-ink-muted hover:text-red-600 disabled:opacity-50"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-ink-muted">Nenhum recurso ainda.</p>
      )}

      {!picker && !creating && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPicker(true)} className={GHOST_BTN}>+ Anexar recurso</button>
          <button type="button" onClick={() => setCreating(true)} className={GHOST_BTN}>+ Criar da aula</button>
        </div>
      )}

      {picker && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (e.target.value.length >= 2) void fetchResources(e.target.value)
                else void fetchResources('')
              }}
              placeholder={instrument ? `Buscar (sugerindo ${instrument})…` : 'Buscar por título ou instrumento…'}
              aria-label={`Buscar recurso para ${section.label}`}
              className={INPUT_CLS}
            />
            <button type="button" onClick={() => setPicker(false)} className="shrink-0 text-xs font-medium text-ink-muted hover:text-ink">fechar</button>
          </div>
          {searching && <p className="text-xs text-ink-muted">Buscando…</p>}
          {!searching && visibleResults.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-hairline">
              {visibleResults.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{r.title}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {r.category} · {r.difficulty}{r.instrument ? ` · ${r.instrument}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => attach(r.id)} disabled={pending} aria-label={`Anexar ${r.title} em ${section.label}`} className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">
                    + Anexar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.length >= 2 && visibleResults.length === 0 && (
            <p className="text-xs text-ink-muted">Nada encontrado. Use “Criar da aula” para um material novo.</p>
          )}
        </div>
      )}

      {creating && (
        <CreateResourceMini
          lessonId={lessonId}
          section={section.id}
          defaultCategory={section.defaultResourceCategory ?? 'Técnica'}
          instrumentCategory={instrumentCategory}
          instrument={instrument}
          onDone={() => setCreating(false)}
        />
      )}

      {note !== undefined && (
        <div className="mt-3">
          <Field label="Nota (opcional)" htmlFor={`note-${section.id}`}>
            <Textarea id={`note-${section.id}`} name={`sec.${section.id}`} defaultValue={note} rows={2} placeholder="Observação livre desta seção" />
          </Field>
        </div>
      )}
    </div>
  )
}

// Mini-form de criação rápida de recurso a partir da aula (cria + anexa).
function CreateResourceMini({
  lessonId,
  section,
  defaultCategory,
  instrumentCategory,
  instrument,
  onDone,
}: {
  lessonId: string
  section: string
  defaultCategory: string
  instrumentCategory: string | null
  instrument: string | null
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [contentType, setContentType] = useState('Texto')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createResourceFromLesson({
        lessonId,
        section,
        title,
        category,
        contentType,
        body: body || undefined,
        contentLink: link || '',
        instrumentCategory,
        instrument,
      })
      if (res.ok) onDone()
      else setError(res.error ?? 'Não foi possível criar.')
    })
  }

  return (
    <div className="mt-1 space-y-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do recurso" aria-label="Título do recurso" className={INPUT_CLS} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria do recurso" className={INPUT_CLS}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={contentType} onChange={(e) => setContentType(e.target.value)} aria-label="Tipo de conteúdo" className={INPUT_CLS}>
          {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {contentType === 'Link Vídeo' || contentType === 'PDF' ? (
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (https://…)" aria-label="Link do recurso" className={INPUT_CLS} />
      ) : (
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Conteúdo / cifra / instruções (resumido)" aria-label="Conteúdo do recurso" className={INPUT_CLS} />
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={pending || !title.trim()} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {pending ? 'Criando…' : 'Criar e anexar'}
        </button>
        <button type="button" onClick={onDone} className="text-xs font-medium text-ink-muted hover:text-ink">cancelar</button>
      </div>
      <p className="text-[11px] text-ink-muted">Cria uma versão resumida agora — dá pra enriquecer depois em Recursos.</p>
    </div>
  )
}
