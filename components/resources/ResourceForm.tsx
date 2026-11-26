'use client'

import { useActionState, useEffect, useState } from 'react'

import { LinkButton, SubmitButton } from '@/components/ds/Button'
import { Field, FieldRow, FormAlert, Input, Select, Textarea } from '@/components/ds/Field'
import { contentMeta } from '@/components/resources/resource-meta'
import { ResourcePreview, type PreviewKind } from '@/components/resources/ResourcePreview'
import styles from '@/components/resources/resources.module.css'
import { InstrumentFields } from '@/components/ui/InstrumentFields'
import { createResource, updateResource, type ResourceActionState } from '@/lib/actions/resources'
import { CATEGORIES, CONTENT_TYPES, DIFFICULTIES } from '@/lib/constants/resources'

interface ResourceData {
  id?: string
  title: string
  category: string
  instrument_category: string | null
  instrument: string | null
  difficulty: string
  content_type: string
  body: string | null
  content_link: string | null
  description: string | null
}

const initial: ResourceActionState = { ok: false }

type FilePreview = { url: string; kind: PreviewKind }

function kindOf(type: string): PreviewKind | null {
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  return null
}

export function ResourceForm({
  resource,
  currentFile,
}: {
  resource?: ResourceData
  /** Arquivo já salvo (URL assinada e tipo), para a prévia ao editar. */
  currentFile?: FilePreview | null
}) {
  const isEdit = Boolean(resource?.id)
  const [state, action] = useActionState(isEdit ? updateResource : createResource, initial)
  const fe = state.fieldErrors ?? {}
  const currentType = resource?.content_type ?? 'Texto'
  const [link, setLink] = useState(resource?.content_link ?? '')
  const [body, setBody] = useState(resource?.body ?? '')
  const [picked, setPicked] = useState<FilePreview | null>(null)
  const [removeCurrent, setRemoveCurrent] = useState(false)

  // A prévia do arquivo escolhido usa uma URL local; libera ao trocar ou sair.
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url) }, [picked])

  const previewFile = picked ?? (removeCurrent ? null : currentFile ?? null)

  return (
    <div className={styles.editor}>
    <div className={styles.formCard}>
      <form action={action} onReset={(event) => event.preventDefault()} className={styles.form}>
        {isEdit && <input type="hidden" name="resourceId" value={resource!.id} />}
        {state.error && <FormAlert>{state.error}</FormAlert>}

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>O recurso</h2>
          <Field label="Título" htmlFor="title" error={fe.title}>
            <Input id="title" name="title" defaultValue={resource?.title ?? ''} placeholder="Ex.: Escala de Dó maior em duas oitavas" required invalid={!!fe.title} />
          </Field>
          <Field label="Descrição curta" htmlFor="description" error={fe.description} hint="Aparece no cartão, para o aluno saber do que se trata.">
            <Textarea id="description" name="description" rows={2} defaultValue={resource?.description ?? ''} />
          </Field>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>Onde ele entra na aula</h2>
          <FieldRow>
            <Field label="Etapa da aula" htmlFor="category" error={fe.category}>
              <Select id="category" name="category" defaultValue={resource?.category ?? 'Aquecimento'}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Nível" htmlFor="difficulty" error={fe.difficulty}>
              <Select id="difficulty" name="difficulty" defaultValue={resource?.difficulty ?? 'Iniciante'}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </FieldRow>
          <FieldRow>
            <InstrumentFields
              ds
              defaultCategory={resource?.instrument_category}
              defaultInstrument={resource?.instrument}
              categoryError={fe.instrumentCategory}
              instrumentError={fe.instrument}
            />
          </FieldRow>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>Conteúdo</h2>
          <fieldset className={styles.typePicker} aria-label="Tipo de conteúdo">
            {CONTENT_TYPES.map((t) => {
              const { Icon } = contentMeta(t)
              return (
                <label key={t} className={styles.typeOption}>
                  <input type="radio" name="contentType" value={t} defaultChecked={t === currentType} />
                  <span><Icon />{t}</span>
                </label>
              )
            })}
          </fieldset>
          {fe.contentType && <FormAlert>{fe.contentType}</FormAlert>}

          <Field label="Link (vídeo, PDF ou página)" htmlFor="contentLink" error={fe.contentLink}>
            <Input id="contentLink" name="contentLink" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" invalid={!!fe.contentLink} />
          </Field>

          <Field label="Arquivo" htmlFor="file" error={fe.file} hint="PDF ou imagem de partitura, de até 10 MB.">
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className={styles.file}
              onChange={(e) => {
                const f = e.target.files?.[0]
                const kind = f ? kindOf(f.type) : null
                setPicked(f && kind ? { url: URL.createObjectURL(f), kind } : null)
              }}
            />
            {currentFile && (
              <div className={styles.current}>
                <a href={currentFile.url} target="_blank" rel="noopener noreferrer">Ver o arquivo atual</a>
                <label><input type="checkbox" name="removeFile" checked={removeCurrent} onChange={(e) => setRemoveCurrent(e.target.checked)} /> Remover</label>
              </div>
            )}
          </Field>

          <Field label="Texto, cifra ou tablatura" htmlFor="body" error={fe.body}>
            <Textarea id="body" name="body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} className={styles.mono} />
          </Field>
        </div>

        <div className={styles.formFoot}>
          <SubmitButton pendingLabel="Salvando…">{isEdit ? 'Salvar alterações' : 'Criar recurso'}</SubmitButton>
          <LinkButton href="/resources" variant="ghost">Cancelar</LinkButton>
        </div>
      </form>
    </div>
    <ResourcePreview file={previewFile} link={link} body={body} />
    </div>
  )
}
