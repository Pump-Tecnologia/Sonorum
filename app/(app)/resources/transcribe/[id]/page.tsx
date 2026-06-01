import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { TranscriptionReview } from '@/components/transcription/TranscriptionReview'
import { TranscriptionUpsell } from '@/components/transcription/TranscriptionUpsell'
import { Card } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { transcriptionAccess } from '@/lib/auth/plan'
import { STATUS_LABEL, type TranscriptionStatus } from '@/lib/constants/transcription'
import { createClient } from '@/lib/supabase/server'
import { signedAudioUrl } from '@/lib/storage/audio'

export const metadata = { title: 'Revisar transcrição' }

export default async function ReviewTranscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await transcriptionAccess()
  if (access !== 'ok') return <TranscriptionUpsell reason={access} />

  const { id } = await params
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('transcription_jobs')
    .select('id, title, instrument, status, body, audio_path, error')
    .eq('id', id)
    .maybeSingle()

  if (!job) notFound()

  const status = job.status as TranscriptionStatus

  // Só revisa o que está pronto. Outros estados mostram um aviso claro.
  if (status !== 'pending_review') {
    return (
      <>
        <PageHeader title="Revisar transcrição" subtitle={job.title} />
        <Card className="space-y-2">
          <p className="text-sm text-ink">
            Esta transcrição está com status <strong>{STATUS_LABEL[status]}</strong>.
          </p>
          {status === 'failed' && job.error && <p className="text-sm text-ink-muted">{job.error}</p>}
          {status === 'processing' && (
            <p className="text-sm text-ink-muted">
              A IA ainda está processando o áudio. Atualize a página em instantes.
            </p>
          )}
          <LinkButton href="/resources/transcribe" variant="ghost" size="sm">← Voltar para a fila</LinkButton>
        </Card>
      </>
    )
  }

  const audioUrl = await signedAudioUrl(job.audio_path)

  return (
    <>
      <PageHeader
        title="Revisar transcrição"
        subtitle="Corrija a cifra gerada pela IA antes de publicar na biblioteca."
      />
      <TranscriptionReview job={job} audioUrl={audioUrl} />
    </>
  )
}
