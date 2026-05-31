import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database'
import { chordsToText } from '@/lib/transcription/format'
import type { TranscriptionResult } from '@/lib/transcription/types'

// Grava o resultado da transcrição num job e o move para revisão. Usa o admin
// client (service role) porque é chamado tanto da action quanto do webhook —
// este último não tem sessão de usuário. NÃO sobrescreve o body se o professor
// já começou a editar (idempotência de webhook).
export async function applyTranscriptionResult(
  jobId: string,
  result: TranscriptionResult,
): Promise<void> {
  const admin = await createAdminClient()
  const { data: job } = await admin
    .from('transcription_jobs')
    .select('body, status')
    .eq('id', jobId)
    .maybeSingle()

  // Job já finalizado/aprovado: não regride o estado.
  if (!job || job.status === 'approved' || job.status === 'rejected') return

  await admin
    .from('transcription_jobs')
    .update({
      status: 'pending_review',
      result: (result.raw ?? result) as Json,
      body: job.body ?? chordsToText(result),
      error: null,
    })
    .eq('id', jobId)
}

export async function markTranscriptionFailed(jobId: string, reason: string): Promise<void> {
  const admin = await createAdminClient()
  await admin
    .from('transcription_jobs')
    .update({ status: 'failed', error: reason })
    .eq('id', jobId)
}
