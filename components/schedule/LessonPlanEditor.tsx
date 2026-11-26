'use client'

import { useActionState, useState, useTransition } from 'react'

import { Button } from '@/components/ds/Button'
import { Field, Input, Select, Textarea } from '@/components/ds/Field'
import { IconClose, IconNote, IconPlus, IconSearch } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import styles from '@/components/schedule/planner.module.css'
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
    <form action={action} className={styles.stack}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="blueprintKey" value={blueprint.key} />

      <section className={styles.panel} aria-label="Objetivos da aula">
        <Field label="Objetivos da aula" htmlFor="goals">
          <Textarea
            id="goals"
            name="goals"
            defaultValue={goals}
            rows={2}
            placeholder="O que o aluno deve alcançar nesta aula?"
            className={styles.goalsInput}
          />
        </Field>
      </section>

      <div className={styles.sections}>
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

      <section className={`${styles.panel} ${styles.extras}`} aria-label="Outros dados do plano">
        {blueprint.fields.length > 0 && (
          <div className={styles.fieldsGrid}>
            {blueprint.fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`fld-${f.key}`}>
                <Input id={`fld-${f.key}`} name={`fld.${f.key}`} defaultValue={content.fields[f.key] ?? ''} placeholder={f.placeholder} />
              </Field>
            ))}
          </div>
        )}
        <Field label="Outras notas" htmlFor="plan_notes">
          <Textarea id="plan_notes" name="plan_notes" defaultValue={content.planNotes} rows={2} placeholder="Lembretes, o que levar para a aula" />
        </Field>
      </section>

      <div className={styles.saveBar}>
        {state.ok && !pending && <p className={`${styles.saveStatus} ${styles.ok}`} role="status">Plano salvo</p>}
        {state.error && !pending && <p className={`${styles.saveStatus} ${styles.bad}`} role="alert">{state.error}</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar plano'}</Button>
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
  const [searchError, setSearchError] = useState(false)
  const [creating, setCreating] = useState(false)
  // Filtro de categoria do RECURSO — começa na categoria da seção (Aquecimento
  // sugere recursos de Aquecimento, etc.); '' = todas.
  const [category, setCategory] = useState<string>(section.defaultResourceCategory ?? '')

  const attachedIds = new Set(resources.map((r) => r.resourceId))
  const titleId = `section-${section.id}-title`

  async function fetchResources(q: string, cat: string) {
    setSearching(true)
    setSearchError(false)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (cat) params.set('category', cat)
    if (instrumentCategory) params.set('instrumentCategory', instrumentCategory)
    try {
      const res = await fetch(`/api/resources?${params.toString()}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as SearchResult[]
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
      setSearchError(true)
    } finally {
      setSearching(false)
    }
  }

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
    <section className={`${styles.panel} ${styles.section}`} aria-labelledby={titleId}>
      <div className={styles.sectionHead}>
        <div>
          <h3 id={titleId} className={styles.sectionTitle}>{section.label}</h3>
          {section.hint && <p className={styles.sectionHint}>{section.hint}</p>}
        </div>
        {resources.length > 0 && (
          <span className={styles.count} aria-label={`${resources.length} ${resources.length === 1 ? 'recurso' : 'recursos'}`}>
            {resources.length}
          </span>
        )}
      </div>

      {resources.length > 0 && (
        <ul className={styles.resources}>
          {resources.map((r) => (
            <li key={r.pivotId} className={styles.resource}>
              <span className={styles.resourceMark}><IconNote /></span>
              <div className={styles.resourceText}>
                <p className={styles.resourceTitle}>{r.title}</p>
                <p className={styles.resourceMeta}>
                  {r.category}
                  {r.instrument ? ` de ${r.instrument}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => detach(r.pivotId)}
                disabled={pending}
                aria-label={`Tirar ${r.title} de ${section.label}`}
                title="Tirar da aula"
                className={styles.remove}
              >
                <IconClose />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!picker && !creating && (
        <div className={styles.sectionActions}>
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              setPicker(true)
              void fetchResources(query, category)
            }}
          >
            <IconPlus /> Anexar recurso
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>Criar recurso</Button>
        </div>
      )}

      {picker && (
        <div className={styles.picker}>
          <div className={styles.pickerRow}>
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); void fetchResources(query, e.target.value) }}
              aria-label={`Categoria dos recursos em ${section.label}`}
              className={styles.pillControl}
            >
              <option value="">Todas</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <label className={styles.search}>
              <IconSearch />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  void fetchResources(e.target.value, category)
                }}
                placeholder={instrument ? `Buscar recurso de ${instrument}` : 'Buscar recurso'}
                aria-label={`Buscar recurso para ${section.label}`}
              />
            </label>
            <button type="button" onClick={() => setPicker(false)} className={styles.remove} aria-label="Fechar a busca" title="Fechar">
              <IconClose />
            </button>
          </div>
          {searching && <p className={styles.pickerNote} role="status">Buscando…</p>}
          {!searching && searchError && <p className={`${styles.pickerNote} ${styles.bad}`} role="alert">Não deu para buscar agora. Tente de novo.</p>}
          {!searching && visibleResults.length > 0 && (
            <ul className={styles.results}>
              {visibleResults.map((r) => (
                <li key={r.id} className={styles.result}>
                  <div className={styles.resourceText}>
                    <p className={styles.resourceTitle}>{r.title}</p>
                    <p className={styles.resourceMeta}>
                      {r.category}, nível {r.difficulty}{r.instrument ? `, ${r.instrument}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="soft" onClick={() => attach(r.id)} disabled={pending} aria-label={`Anexar ${r.title} em ${section.label}`}>
                    Anexar
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {!searching && !searchError && visibleResults.length === 0 && (
            <p className={styles.pickerNote}>Nenhum recurso encontrado</p>
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
        <Field label="Nota" htmlFor={`note-${section.id}`}>
          <Textarea id={`note-${section.id}`} name={`sec.${section.id}`} defaultValue={note} rows={2} placeholder="Anotação livre" />
        </Field>
      )}
    </section>
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
  const isLink = contentType === 'Link Vídeo' || contentType === 'PDF'

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
    <div className={styles.create}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do recurso" aria-label="Título do recurso" autoFocus />
      <div className={styles.fieldsGrid}>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria do recurso">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={contentType} onChange={(e) => setContentType(e.target.value)} aria-label="Tipo de conteúdo">
          {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      {isLink ? (
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-label="Link do recurso" inputMode="url" />
      ) : (
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Cifra, exercício ou instruções" aria-label="Conteúdo do recurso" />
      )}
      {error && <p className={`${styles.pickerNote} ${styles.bad}`} role="alert">{error}</p>}
      <div className={styles.createActions}>
        <Button size="sm" onClick={submit} disabled={pending || !title.trim()}>
          {pending ? 'Criando…' : 'Criar e anexar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
        <InfoButton label="Sobre o recurso criado aqui">
          O recurso entra na biblioteca da escola e fica anexado a esta aula. Dá para completar depois em Recursos.
        </InfoButton>
      </div>
    </div>
  )
}
