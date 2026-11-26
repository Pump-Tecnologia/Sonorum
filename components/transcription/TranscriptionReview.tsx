'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { InstrumentSelect } from '@/components/ui/InstrumentFields'
import {
  approveTranscription,
  rejectTranscription,
  saveTranscriptionDraft,
  type TranscriptionActionState,
} from '@/lib/actions/transcription'
import { CATEGORIES, DIFFICULTIES } from '@/lib/constants/resources'

interface ReviewJob {
  id: string
  title: string
  instrument: string | null
  body: string | null
}

const initial: TranscriptionActionState = { ok: false }

// Revisão do rascunho: o professor edita a cifra, ajusta os metadados e aprova
// (vira recurso da biblioteca) ou rejeita. "Salvar rascunho" persiste o texto
// sem aprovar — útil quando a revisão fica para depois.
export function TranscriptionReview({ job, audioUrl }: { job: ReviewJob; audioUrl: string | null }) {
  const [state, action] = useActionState(approveTranscription, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card className="space-y-4">
        <div>
          <h2 className="sn-card-title">Áudio original</h2>
          
        </div>
        {audioUrl ? (
          <audio controls src={audioUrl} className="w-full" preload="none" />
        ) : (
          <p className="m-0 text-sm text-(--sn-text-muted)">Áudio indisponível.</p>
        )}

        <form action={rejectTranscription} className="pt-4 shadow-[inset_0_1px_0_var(--sn-hairline)]">
          <input type="hidden" name="jobId" value={job.id} />
          <button
            type="submit"
            className="sn-btn sn-btn-sm sn-btn-danger"
          >
            Rejeitar transcrição
          </button>
        </form>
      </Card>

      <Card>
        <form action={action} className="space-y-5">
          <input type="hidden" name="jobId" value={job.id} />

          {state.error && (
            <p className="sn-alert" role="alert">{state.error}</p>
          )}

          <Field label="Título" htmlFor="title" error={fe.title}>
            <Input id="title" name="title" defaultValue={job.title} required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <InstrumentSelect defaultValue={job.instrument} error={fe.instrument} optional />
            <Field label="Categoria" htmlFor="category" error={fe.category}>
              <Select id="category" name="category" defaultValue="Repertório">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Dificuldade" htmlFor="difficulty" error={fe.difficulty}>
              <Select id="difficulty" name="difficulty" defaultValue="Iniciante">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>

          <Field
            label="Cifra gerada pela IA"
            htmlFor="body"
            error={fe.body}
            hint="A transcrição automática não é perfeita. Ajuste acordes e tempos antes de aprovar."
          >
            <Textarea id="body" name="body" rows={16} defaultValue={job.body ?? ''} className="font-mono" required />
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton pendingLabel="Aprovando…">Aprovar e publicar na biblioteca</SubmitButton>
            {/* formAction sobrescreve o action do form e envia o MESMO FormData
                (título, cifra, etc.) para salvar sem aprovar. */}
            <button
              type="submit"
              formAction={saveTranscriptionDraft}
              className="sn-btn sn-btn-sm sn-btn-ghost"
            >
              Salvar rascunho sem aprovar
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
