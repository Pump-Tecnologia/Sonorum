'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { InstrumentSelect } from '@/components/ui/InstrumentFields'
import { createTranscription, type TranscriptionActionState } from '@/lib/actions/transcription'
import { AUDIO_ACCEPT } from '@/lib/constants/transcription'

const initial: TranscriptionActionState = { ok: false }

export function TranscriptionUploadForm() {
  const [state, action] = useActionState(createTranscription, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card>
      <form action={action} className="max-w-2xl space-y-5">
        {state.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
        )}

        <Field label="Título da música" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" placeholder="Ex.: Asa Branca" required />
        </Field>

        <InstrumentSelect label="Instrumento (opcional)" error={fe.instrument} optional />

        <Field
          label="Áudio (MP3, WAV, M4A · até 25MB)"
          htmlFor="file"
          error={fe.file}
          hint="Funciona melhor com instrumento solo e gravação limpa. A IA gera um rascunho — você revisa antes de aprovar."
        >
          <input
            id="file"
            name="file"
            type="file"
            accept={AUDIO_ACCEPT}
            required
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
          />
        </Field>

        <SubmitButton pendingLabel="Enviando…">Transcrever</SubmitButton>
      </form>
    </Card>
  )
}
