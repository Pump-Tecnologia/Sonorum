import { PageHeader } from '@/components/app/PageHeader'
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
        subtitle="A IA gera um rascunho de cifra a partir do áudio. Você revisa antes de publicar."
      />
      <TranscriptionUploadForm />
    </>
  )
}
