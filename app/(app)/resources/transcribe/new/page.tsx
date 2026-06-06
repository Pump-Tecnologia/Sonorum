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
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <span aria-hidden="true" className="text-lg leading-none">🚧</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Recurso em desenvolvimento</p>
          <p className="mt-0.5 text-sm text-amber-800">
            A transcrição por IA ainda está sendo finalizada — os resultados podem ser imprecisos.
          </p>
        </div>
      </div>
      <TranscriptionUploadForm />
    </>
  )
}
