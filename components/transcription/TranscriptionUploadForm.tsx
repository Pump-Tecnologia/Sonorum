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
          <p className="sn-alert" role="alert">{state.error}</p>
        )}

        <Field label="Título da música" htmlFor="title" error={fe.title}>
          <Input id="title" name="title" placeholder="Ex.: Asa Branca" required />
        </Field>

        <InstrumentSelect label="Instrumento (opcional)" error={fe.instrument} optional />

        <Field
          label="Áudio"
          htmlFor="file"
          error={fe.file}
          hint="MP3, WAV ou M4A de até 25 MB."
        >
          <input
            id="file"
            name="file"
            type="file"
            accept={AUDIO_ACCEPT}
            required
            className="block w-full text-sm text-(--sn-text-muted) file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-(--sn-mint-soft) file:px-4 file:text-sm file:font-medium file:text-(--sn-ink-soft) hover:file:bg-(--sn-mint-hover)"
          />
        </Field>

        <SubmitButton pendingLabel="Enviando…">Transcrever</SubmitButton>
      </form>
    </Card>
  )
}
