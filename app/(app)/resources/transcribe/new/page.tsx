import { PageHeader } from '@/components/app/PageHeader'
import { StatusPill } from '@/components/ds/StatusPill'
import { TranscriptionUploadForm } from '@/components/transcription/TranscriptionUploadForm'
import { TranscriptionUpsell } from '@/components/transcription/TranscriptionUpsell'
import { transcriptionAccess } from '@/lib/auth/plan'

export const metadata = { title: 'Transcrever áudio' }

export default async function NewTranscriptionPage() {
  const access = await transcriptionAccess()
  if (access !== 'ok') return <TranscriptionUpsell reason={access} />

  return (
    <>
      <PageHeader
        title="Transcrever áudio"
        info="A IA gera um rascunho de cifra a partir do áudio e você revisa antes de publicar. O recurso ainda está sendo finalizado e os resultados podem sair imprecisos."
        back={{ href: '/resources/transcribe', label: 'Transcrições' }}
      />
      <div className="mb-6 px-2">
        <StatusPill tone="warning">Em desenvolvimento</StatusPill>
      </div>
      <TranscriptionUploadForm />
    </>
  )
}
