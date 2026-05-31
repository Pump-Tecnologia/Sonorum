import { createAdminClient } from '@/lib/supabase/server'
import { AUDIO_EXT_BY_MIME, AUDIO_MAX_BYTES } from '@/lib/constants/transcription'

// Storage de áudios enviados para transcrição. Bucket PRIVADO: todo acesso é
// via URL assinada gerada no servidor (service role) — espelha lib/storage/resources.ts.
const BUCKET = 'audio'

export type UploadResult = { ok: true; path: string } | { ok: false; error: string }

export async function uploadAudioFile(file: File, schoolId: string | null): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: 'Arquivo vazio.' }
  if (file.size > AUDIO_MAX_BYTES) return { ok: false, error: 'Áudio acima do limite de 25MB.' }
  const ext = AUDIO_EXT_BY_MIME[file.type]
  if (!ext) return { ok: false, error: 'Formato não suportado. Use MP3, WAV, M4A, AAC ou OGG.' }

  const admin = await createAdminClient()
  const path = `${schoolId ?? 'global'}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, error: 'Falha ao enviar o áudio.' }
  return { ok: true, path }
}

// URL assinada — usada tanto na tela de revisão (player) quanto para entregar o
// áudio ao provedor de transcrição.
export async function signedAudioUrl(path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null
  const admin = await createAdminClient()
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

export async function deleteAudioFile(path: string | null): Promise<void> {
  if (!path) return
  const admin = await createAdminClient()
  await admin.storage.from(BUCKET).remove([path])
}
