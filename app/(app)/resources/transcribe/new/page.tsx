import { PageHeader } from '@/components/app/PageHeader'
import { TranscriptionUploadForm } from '@/components/transcription/TranscriptionUploadForm'

export const metadata = { title: 'Transcrever áudio' }

export default function NewTranscriptionPage() {
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
