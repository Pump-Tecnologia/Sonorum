'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { createTemplate, updateTemplate, type TemplateActionState } from '@/lib/actions/resource-templates'
import { CATEGORIES, INST_CATEGORIES, DIFFICULTIES, CONTENT_TYPES } from '@/lib/constants/resources'

interface TemplateData {
  id: string
  title: string
  description: string | null
  category: string | null
  instrument_category: string | null
  instrument: string | null
  difficulty: string | null
  content_type: string
  body: string | null
  content_link: string | null
}

const initial: TemplateActionState = { ok: false }

export function TemplateForm({ template }: { template?: TemplateData }) {
  const isEdit = Boolean(template?.id)
  const action = isEdit ? updateTemplate : createTemplate
  const [state, formAction] = useActionState(action, initial)
  const fe = state.fieldErrors ?? {}
  const router = useRouter()

  useEffect(() => {
    if (state.ok) router.push('/superadmin/biblioteca')
  }, [state.ok, router])

  return (
    <Card>
      <form action={formAction} className="max-w-2xl space-y-5">
        {isEdit && <input type="hidden" name="templateId" value={template!.id} />}
        {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

        <Field label="Título" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" defaultValue={template?.title ?? ''} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="category" error={fe.category}>
            <Select id="category" name="category" defaultValue={template?.category ?? 'Aquecimento'}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Dificuldade" htmlFor="difficulty" error={fe.difficulty}>
            <Select id="difficulty" name="difficulty" defaultValue={template?.difficulty ?? 'Iniciante'}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Categoria do instrumento" htmlFor="instrumentCategory" error={fe.instrumentCategory}>
            <Select id="instrumentCategory" name="instrumentCategory" defaultValue={template?.instrument_category ?? ''}>
              <option value="">—</option>
              {INST_CATEGORIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
          </Field>
          <Field label="Instrumento" htmlFor="instrument" error={fe.instrument}>
            <Input id="instrument" name="instrument" defaultValue={template?.instrument ?? ''} placeholder="Violão, Piano…" />
          </Field>
        </div>

        <Field label="Tipo de conteúdo" htmlFor="contentType" error={fe.contentType}>
          <Select id="contentType" name="contentType" defaultValue={template?.content_type ?? 'Texto'}>
            {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Field label="Link do conteúdo (opcional)" htmlFor="contentLink" error={fe.contentLink}>
          <Input id="contentLink" name="contentLink" type="url" defaultValue={template?.content_link ?? ''} placeholder="https://…" />
        </Field>

        <Field label="Descrição curta" htmlFor="description" error={fe.description}>
          <Textarea id="description" name="description" rows={2} defaultValue={template?.description ?? ''} />
        </Field>

        <Field label="Conteúdo (texto / cifra / tablatura)" htmlFor="body" error={fe.body}>
          <Textarea id="body" name="body" rows={6} defaultValue={template?.body ?? ''} className="font-mono" />
        </Field>

        <SubmitButton pendingLabel="Salvando…">{isEdit ? 'Salvar alterações' : 'Criar recurso'}</SubmitButton>
      </form>
    </Card>
  )
}
