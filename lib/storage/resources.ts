import { createAdminClient } from '@/lib/supabase/server'

// Storage de arquivos de recursos pedagógicos (PDF/partitura). Bucket PRIVADO:
// todo acesso é mediado por URL assinada gerada no servidor (service role).
const BUCKET = 'resources'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type UploadResult = { ok: true; path: string } | { ok: false; error: string }

export async function uploadResourceFile(file: File, schoolId: string | null): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: 'Arquivo vazio.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Arquivo acima do limite de 10MB.' }
  const ext = EXT_BY_MIME[file.type]
  if (!ext) return { ok: false, error: 'Formato não suportado. Use PDF, PNG, JPG ou WEBP.' }

  const admin = await createAdminClient()
  const path = `${schoolId ?? 'global'}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, error: 'Falha ao enviar o arquivo.' }
  return { ok: true, path }
}

// URL assinada única (ex.: página de edição).
export async function signedResourceUrl(path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null
  const admin = await createAdminClient()
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

// URLs assinadas em lote (listas) — uma chamada só. Mapeia path -> url.
export async function signedResourceUrls(
  paths: Array<string | null>,
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const valid = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  if (valid.length === 0) return {}
  const admin = await createAdminClient()
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(valid, expiresIn)
  const map: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl
  }
  return map
}

export async function deleteResourceFile(path: string | null): Promise<void> {
  if (!path) return
  const admin = await createAdminClient()
  await admin.storage.from(BUCKET).remove([path])
}
