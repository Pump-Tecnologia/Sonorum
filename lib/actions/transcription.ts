'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { CATEGORIES, DIFFICULTIES } from '@/lib/constants/resources'
import { createClient } from '@/lib/supabase/server'
import { deleteAudioFile, signedAudioUrl, uploadAudioFile } from '@/lib/storage/audio'
import { getTranscriptionProvider } from '@/lib/transcription'
import { applyTranscriptionResult, markTranscriptionFailed } from '@/lib/transcription/process'

export type TranscriptionActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

const QUEUE_PATH = '/resources/transcribe'

function fe(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
  )
}

async function requireStaff() {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher', 'superadmin'].includes(me.role)) return null
  return me
}

const uploadSchema = z.object({
  title: z.string().min(1, 'Informe um título').max(255),
  instrument: z.string().max(255).optional(),
})

// Sobe o áudio, cria o job e dispara a transcrição. Provedor síncrono (mock)
// já volta com o resultado; assíncrono (real) fica em 'processing' até o webhook.
export async function createTranscription(
  _prev: TranscriptionActionState,
  formData: FormData,
): Promise<TranscriptionActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = uploadSchema.safeParse({
    title: formData.get('title'),
    instrument: formData.get('instrument') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, fieldErrors: { file: 'Envie um arquivo de áudio.' } }
  }

  const schoolId = me.role === 'superadmin' ? null : me.schoolId
  const up = await uploadAudioFile(file, schoolId)
  if (!up.ok) return { ok: false, fieldErrors: { file: up.error } }

  const supabase = await createClient()
  const provider = getTranscriptionProvider()
  const { data: job, error } = await supabase
    .from('transcription_jobs')
    .insert({
      school_id: schoolId,
      title: parsed.data.title,
      instrument: parsed.data.instrument || null,
      audio_path: up.path,
      status: 'processing',
      provider: provider.name,
      created_by: me.id,
    })
    .select('id')
    .single()

  if (error || !job) {
    await deleteAudioFile(up.path) // rollback do upload órfão
    return { ok: false, error: 'Não foi possível iniciar a transcrição.' }
  }

  // Dispara o provedor. Falhas aqui não perdem o job — ficam registradas como
  // 'failed' e o staff pode reenviar.
  try {
    const audioUrl = await signedAudioUrl(up.path)
    if (!audioUrl) throw new Error('Não foi possível gerar a URL do áudio.')
    const outcome = await provider.submit(audioUrl, { instrument: parsed.data.instrument })

    if (outcome.status === 'completed') {
      await applyTranscriptionResult(job.id, outcome.result)
    } else {
      await supabase.from('transcription_jobs').update({ external_id: outcome.externalId }).eq('id', job.id)
    }
  } catch (err) {
    await markTranscriptionFailed(job.id, err instanceof Error ? err.message : 'Falha na transcrição.')
  }

  revalidatePath(QUEUE_PATH)
  redirect(QUEUE_PATH)
}

// Professor salva a cifra editada sem aprovar ainda.
export async function saveTranscriptionDraft(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const jobId = String(formData.get('jobId') ?? '')
  const body = String(formData.get('body') ?? '')
  const supabase = await createClient()
  await supabase.from('transcription_jobs').update({ body }).eq('id', jobId)
  revalidatePath(`${QUEUE_PATH}/${jobId}`)
}

const approveSchema = z.object({
  jobId: z.string().uuid(),
  title: z.string().min(1).max(255),
  instrument: z.string().max(255).optional(),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  body: z.string().min(1, 'A cifra não pode estar vazia'),
})

// Aprova o rascunho: cria um pedagogical_resource (biblioteca) e marca o job.
export async function approveTranscription(
  _prev: TranscriptionActionState,
  formData: FormData,
): Promise<TranscriptionActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = approveSchema.safeParse({
    jobId: formData.get('jobId'),
    title: formData.get('title'),
    instrument: formData.get('instrument') || undefined,
    category: formData.get('category'),
    difficulty: formData.get('difficulty'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const d = parsed.data
  const schoolId = me.role === 'superadmin' ? null : me.schoolId
  const supabase = await createClient()

  const { data: resource, error: resErr } = await supabase
    .from('pedagogical_resources')
    .insert({
      school_id: schoolId,
      title: d.title,
      category: d.category,
      instrument: d.instrument || null,
      difficulty: d.difficulty,
      content_type: 'Cifra/Tablatura',
      body: d.body,
      description: 'Cifra gerada por IA e revisada pelo professor.',
      created_by: me.id,
    })
    .select('id')
    .single()

  if (resErr || !resource) return { ok: false, error: 'Não foi possível criar o recurso.' }

  await supabase
    .from('transcription_jobs')
    .update({ status: 'approved', body: d.body, resource_id: resource.id, reviewed_by: me.id })
    .eq('id', d.jobId)

  revalidatePath(QUEUE_PATH)
  revalidatePath('/resources')
  redirect('/resources')
}

export async function rejectTranscription(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const jobId = String(formData.get('jobId') ?? '')
  const supabase = await createClient()
  await supabase
    .from('transcription_jobs')
    .update({ status: 'rejected', reviewed_by: me.id })
    .eq('id', jobId)
  revalidatePath(QUEUE_PATH)
}

// Reenfileira um job que falhou (gera nova tentativa com o mesmo áudio).
export async function retryTranscription(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const jobId = String(formData.get('jobId') ?? '')
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('transcription_jobs')
    .select('audio_path, instrument')
    .eq('id', jobId)
    .maybeSingle()
  if (!job?.audio_path) return

  const provider = getTranscriptionProvider()
  await supabase
    .from('transcription_jobs')
    .update({ status: 'processing', error: null, provider: provider.name })
    .eq('id', jobId)

  try {
    const audioUrl = await signedAudioUrl(job.audio_path)
    if (!audioUrl) throw new Error('Não foi possível gerar a URL do áudio.')
    const outcome = await provider.submit(audioUrl, { instrument: job.instrument })
    if (outcome.status === 'completed') {
      await applyTranscriptionResult(jobId, outcome.result)
    } else {
      await supabase.from('transcription_jobs').update({ external_id: outcome.externalId }).eq('id', jobId)
    }
  } catch (err) {
    await markTranscriptionFailed(jobId, err instanceof Error ? err.message : 'Falha na transcrição.')
  }
  revalidatePath(QUEUE_PATH)
}

export async function deleteTranscription(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const jobId = String(formData.get('jobId') ?? '')
  const supabase = await createClient()
  const { data: job } = await supabase
    .from('transcription_jobs')
    .select('audio_path')
    .eq('id', jobId)
    .maybeSingle()
  await supabase.from('transcription_jobs').delete().eq('id', jobId)
  if (job?.audio_path) await deleteAudioFile(job.audio_path)
  revalidatePath(QUEUE_PATH)
}
