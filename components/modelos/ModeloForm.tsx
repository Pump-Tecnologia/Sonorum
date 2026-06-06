'use client'

import { useActionState } from 'react'

import { InstrumentFields } from '@/components/ui/InstrumentFields'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import {
  createLessonPlanTemplate,
  updateLessonPlanTemplate,
  type TemplateActionState,
} from '@/lib/actions/lesson-templates'

export interface TemplateData {
  id: string
  name: string
  instrument_category: string | null
  instrument: string | null
  goals: string | null
  warmup_note: string | null
  repertoire_note: string | null
  homework_note: string | null
  target_bpm: string | null
}

const initial: TemplateActionState = { ok: false }

export function ModeloForm({ template }: { template?: TemplateData }) {
  const isEdit = Boolean(template)
  const action = isEdit ? updateLessonPlanTemplate : createLessonPlanTemplate
  const [state, formAction, pending] = useActionState(action, initial)
  const fieldErrors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="templateId" value={template!.id} />}

      <Card className="space-y-4">
        <Field label="Nome do modelo" htmlFor="name" error={fieldErrors.name}>
          <Input id="name" name="name" defaultValue={template?.name ?? ''} placeholder="ex.: Violão iniciante — aula padrão" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <InstrumentFields
            defaultCategory={template?.instrument_category}
            defaultInstrument={template?.instrument}
            categoryError={fieldErrors.instrumentCategory}
            instrumentError={fieldErrors.instrument}
            instrumentLabel="Instrumento (opcional)"
          />
        </div>
        <p className="text-xs text-ink-muted">A categoria/instrumento ajuda a sugerir este modelo nas aulas do aluno certo.</p>
      </Card>

      <Card className="space-y-4">
        <Field label="Objetivos" htmlFor="goals">
          <Textarea id="goals" name="goals" defaultValue={template?.goals ?? ''} rows={2} placeholder="Objetivo padrão desta aula" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Aquecimento" htmlFor="warmupNote">
            <Textarea id="warmupNote" name="warmupNote" defaultValue={template?.warmup_note ?? ''} rows={3} />
          </Field>
          <Field label="Repertório" htmlFor="repertoireNote">
            <Textarea id="repertoireNote" name="repertoireNote" defaultValue={template?.repertoire_note ?? ''} rows={3} />
          </Field>
          <Field label="Tarefa de casa" htmlFor="homeworkNote">
            <Textarea id="homeworkNote" name="homeworkNote" defaultValue={template?.homework_note ?? ''} rows={3} />
          </Field>
        </div>
        <div className="max-w-[220px]">
          <Field label="Meta de BPM (opcional)" htmlFor="targetBpm">
            <Input id="targetBpm" name="targetBpm" defaultValue={template?.target_bpm ?? ''} placeholder="ex.: 90 ou 80–120" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar modelo'}
        </Button>
        {state.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
      </div>
    </form>
  )
}
