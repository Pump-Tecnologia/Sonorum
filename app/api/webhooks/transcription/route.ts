import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/server'
import { getTranscriptionProvider } from '@/lib/transcription'
import { applyTranscriptionResult, markTranscriptionFailed } from '@/lib/transcription/process'

// Callback do provedor de transcrição assíncrono (ex.: Klangio). Quando o job
// termina, o provedor chama aqui com o id externo; buscamos o resultado e
// movemos o job para revisão. Protegido por segredo compartilhado.
//
// Sem sessão de usuário → usa admin client. Por isso o segredo é obrigatório.
export async function POST(request: NextRequest) {
  const secret = process.env.TRANSCRIPTION_WEBHOOK_SECRET
  if (!secret || request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: { external_id?: string; status?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const externalId = payload.external_id
  if (!externalId) return NextResponse.json({ error: 'missing external_id' }, { status: 400 })

  const admin = await createAdminClient()
  const { data: job } = await admin
    .from('transcription_jobs')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 })

  try {
    if (payload.status === 'failed') {
      await markTranscriptionFailed(job.id, 'O provedor reportou falha na transcrição.')
    } else {
      const provider = getTranscriptionProvider()
      const result = await provider.fetchResult(externalId)
      await applyTranscriptionResult(job.id, result)
    }
  } catch (err) {
    await markTranscriptionFailed(job.id, err instanceof Error ? err.message : 'Falha ao buscar resultado.')
  }

  return NextResponse.json({ ok: true })
}
