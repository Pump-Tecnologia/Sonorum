'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { createResource, updateResource, type ResourceActionState } from '@/lib/actions/resources'
import { CATEGORIES, INST_CATEGORIES, DIFFICULTIES, CONTENT_TYPES } from '@/lib/constants/resources'

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

export function ResourceForm({ resource }: { resource?: ResourceData }) {
  const isEdit = Boolean(resource?.id)
  const [state, action] = useActionState(isEdit ? updateResource : createResource, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card>
      <form action={action} className="max-w-2xl space-y-5">
        {isEdit && <input type="hidden" name="resourceId" value={resource!.id} />}

        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
        )}

        <Field label="Título" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" defaultValue={resource?.title ?? ''} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="category" error={fe.category}>
            <Select id="category" name="category" defaultValue={resource?.category ?? 'Aquecimento'}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label="Dificuldade" htmlFor="difficulty" error={fe.difficulty}>
            <Select id="difficulty" name="difficulty" defaultValue={resource?.difficulty ?? 'Iniciante'}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>

          <Field label="Categoria do instrumento" htmlFor="instrumentCategory" error={fe.instrumentCategory}>
            <Select id="instrumentCategory" name="instrumentCategory" defaultValue={resource?.instrument_category ?? ''}>
              <option value="">— sem categoria —</option>
              {INST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>

          <Field label="Instrumento específico" htmlFor="instrument" error={fe.instrument}>
            <Input id="instrument" name="instrument" defaultValue={resource?.instrument ?? ''} placeholder="Violão, Piano…" />
          </Field>
        </div>

        <Field label="Tipo de conteúdo" htmlFor="contentType" error={fe.contentType}>
          <Select id="contentType" name="contentType" defaultValue={resource?.content_type ?? 'Texto'}>
            {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Field label="Link do conteúdo (vídeo, PDF externo, etc.)" htmlFor="contentLink" error={fe.contentLink}>
          <Input id="contentLink" name="contentLink" type="url" defaultValue={resource?.content_link ?? ''} placeholder="https://…" />
        </Field>

        <Field label="Descrição curta" htmlFor="description" error={fe.description}>
          <Textarea id="description" name="description" rows={2} defaultValue={resource?.description ?? ''} />
        </Field>

        <Field label="Conteúdo (texto / cifra / tablatura)" htmlFor="body" error={fe.body}>
          <Textarea id="body" name="body" rows={6} defaultValue={resource?.body ?? ''} className="font-mono" />
        </Field>

        <SubmitButton pendingLabel="Salvando…">{isEdit ? 'Salvar alterações' : 'Criar recurso'}</SubmitButton>
      </form>
    </Card>
  )
}
