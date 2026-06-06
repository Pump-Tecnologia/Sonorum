'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'

import { Field, Textarea } from '@/components/ui/Field'
import {
  attachResource,
  createResourceFromLesson,
  detachResource,
  saveLessonPlan,
  type LessonActionState,
} from '@/lib/actions/lessons'
import { CATEGORIES, CONTENT_TYPES } from '@/lib/constants/resources'

export interface AttachedResource {
  pivotId: string
  section: string
  resourceId: string
  title: string
  category: string
  difficulty: string
  instrument: string | null
}

export interface PlanData {
  warmup: string
  repertoire: string
  homework: string
  target_bpm: string
  notes: string
}

interface SearchResult {
  id: string
  title: string
  category: string
  instrument: string | null
  instrument_category: string | null
  difficulty: string
}

type SectionKey = 'warmup' | 'repertoire' | 'homework' | 'general'

const SECTIONS: { key: SectionKey; label: string; hint: string; defaultCategory: string; hasNote: boolean }[] = [
  { key: 'warmup', label: 'Aquecimento', hint: 'Exercícios para começar a aula', defaultCategory: 'Aquecimento', hasNote: true },
  { key: 'repertoire', label: 'Repertório', hint: 'Músicas e estudos da aula', defaultCategory: 'Repertório', hasNote: true },
  { key: 'homework', label: 'Tarefa de casa', hint: 'O que praticar até a próxima', defaultCategory: 'Tarefa de Casa', hasNote: true },
  { key: 'general', label: 'Outros materiais', hint: 'Recursos de apoio (opcional)', defaultCategory: 'Técnica', hasNote: false },
]

const PRIMARY_BTN = 'rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60'
const GHOST_BTN = 'rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted'
const INPUT_CLS = 'w-full rounded-xl border border-hairline bg-surface px-3.5 py-2 text-sm focus:outline-2 focus:outline-brand-500'

const initialSave: LessonActionState = { ok: false }

export function LessonPlanEditor({
  lessonId,
  goals,
  plan,
  attached,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  goals: string
  plan: PlanData
  attached: AttachedResource[]
  instrumentCategory: string | null
  instrument: string | null
}) {
  const [state, action, pending] = useActionState(saveLessonPlan, initialSave)
  const [bpmOpen, setBpmOpen] = useState(Boolean(plan.target_bpm))
  // Valor do BPM em estado controlado: persiste mesmo recolhido (via input
  // hidden), então o save nunca limpa o BPM por acidente — só "remover" limpa.
  const [bpm, setBpm] = useState(plan.target_bpm)

  const bySection = (key: SectionKey) => attached.filter((r) => r.section === key)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lessonId" value={lessonId} />

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <Field label="Objetivos da aula" htmlFor="goals">
          <Textarea
            id="goals"
            name="goals"
            defaultValue={goals}
            rows={2}
            placeholder="O que o aluno deve alcançar nesta aula?"
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SECTIONS.filter((s) => s.hasNote).map((s) => (
          <SectionEditor
            key={s.key}
            lessonId={lessonId}
            section={s.key}
            label={s.label}
            hint={s.hint}
            defaultCategory={s.defaultCategory}
            note={plan[s.key as 'warmup' | 'repertoire' | 'homework']}
            resources={bySection(s.key)}
            instrumentCategory={instrumentCategory}
            instrument={instrument}
          />
        ))}
      </div>

      <SectionEditor
        lessonId={lessonId}
        section="general"
        label="Outros materiais"
        hint="Recursos de apoio (opcional)"
        defaultCategory="Técnica"
        resources={bySection('general')}
        instrumentCategory={instrumentCategory}
        instrument={instrument}
      />

      <div className="rounded-2xl border border-hairline bg-surface p-5 space-y-4">
        {bpmOpen ? (
          <div className="flex items-end gap-3">
            <div className="max-w-[200px]">
              <Field label="Meta de BPM (opcional)" htmlFor="target_bpm">
                <input id="target_bpm" name="target_bpm" value={bpm} onChange={(e) => setBpm(e.target.value)} className={INPUT_CLS} placeholder="ex.: 90 ou 80–120" />
              </Field>
            </div>
            <button type="button" onClick={() => { setBpm(''); setBpmOpen(false) }} className="pb-2.5 text-xs font-medium text-ink-muted hover:text-ink">
              remover
            </button>
          </div>
        ) : (
          <>
            <input type="hidden" name="target_bpm" value={bpm} />
            <button type="button" onClick={() => setBpmOpen(true)} className={GHOST_BTN}>
              + Adicionar meta de BPM
            </button>
          </>
        )}

        <Field label="Outras notas do planejamento" htmlFor="plan_notes">
          <Textarea id="plan_notes" name="plan_notes" defaultValue={plan.notes} rows={2} placeholder="Lembretes, materiais a levar, etc." />
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
  label,
  hint,
  defaultCategory,
  note,
  resources,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  section: SectionKey
  label: string
  hint: string
  defaultCategory: string
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

  // Ao abrir o picker, já carrega sugestões pelo instrumento do aluno.
  useEffect(() => {
    if (picker && results.length === 0 && !query) void fetchResources('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker])

  function attach(resourceId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lessonId', lessonId)
      fd.set('resourceId', resourceId)
      fd.set('section', section)
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
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <p className="text-xs text-ink-muted">{hint}</p>
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
                aria-label={`Remover ${r.title} de ${label}`}
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
              aria-label={`Buscar recurso para ${label}`}
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
                  <button type="button" onClick={() => attach(r.id)} disabled={pending} aria-label={`Anexar ${r.title} em ${label}`} className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">
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
          section={section}
          defaultCategory={defaultCategory}
          instrumentCategory={instrumentCategory}
          instrument={instrument}
          onDone={() => setCreating(false)}
        />
      )}

      {note !== undefined && (
        <div className="mt-3">
          <Field label="Nota (opcional)" htmlFor={`note-${section}`}>
            <Textarea id={`note-${section}`} name={section} defaultValue={note} rows={2} placeholder="Observação livre desta seção" />
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
  section: SectionKey
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
