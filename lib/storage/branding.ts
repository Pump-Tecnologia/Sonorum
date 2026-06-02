import { createAdminClient } from '@/lib/supabase/server'

// Logo da escola (marca personalizada). Bucket PÚBLICO 'branding' — leitura
// direta no shell; upload via service role no servidor.
const BUCKET = 'branding'
const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export type LogoUpload = { ok: true; url: string } | { ok: false; error: string }

export async function uploadSchoolLogo(file: File, schoolId: string): Promise<LogoUpload> {
  if (!file || file.size === 0) return { ok: false, error: 'Arquivo vazio.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Logo acima do limite de 2MB.' }
  const ext = EXT_BY_MIME[file.type]
  if (!ext) return { ok: false, error: 'Formato inválido. Use PNG, JPG, WEBP ou SVG.' }

  const admin = await createAdminClient()
  const path = `${schoolId}/logo-${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, error: 'Falha ao enviar o logo.' }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

export async function deleteSchoolLogo(url: string | null): Promise<void> {
  if (!url) return
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = url.slice(i + marker.length)
  const admin = await createAdminClient()
  await admin.storage.from(BUCKET).remove([path])
}
