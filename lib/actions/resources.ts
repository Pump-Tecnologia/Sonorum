'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { CATEGORIES, INST_CATEGORIES, DIFFICULTIES, CONTENT_TYPES } from '@/lib/constants/resources'
import { deleteResourceFile, uploadResourceFile } from '@/lib/storage/resources'

export type ResourceActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const resourceSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.enum(CATEGORIES),
  instrumentCategory: z.enum(INST_CATEGORIES).optional().or(z.literal('')),
  instrument: z.string().max(255).optional(),
  difficulty: z.enum(DIFFICULTIES),
  contentType: z.enum(CONTENT_TYPES),
  body: z.string().optional(),
  contentLink: z.string().url('URL inválida').optional().or(z.literal('')),
  description: z.string().optional(),
})

function fe(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
  )
}

async function requireStaff() {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return null
  return me
}

export async function createResource(_prev: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = resourceSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    instrumentCategory: formData.get('instrumentCategory') || '',
    instrument: formData.get('instrument') || undefined,
    difficulty: formData.get('difficulty'),
    contentType: formData.get('contentType'),
    body: formData.get('body') || undefined,
    contentLink: formData.get('contentLink') || '',
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const d = parsed.data
  const schoolId = me.role === 'superadmin' ? null : me.schoolId

  // Upload de arquivo (PDF/partitura), se enviado.
  let filePath: string | null = null
  const file = formData.get('file')
  if (file instanceof File && file.size > 0) {
    const up = await uploadResourceFile(file, schoolId)
    if (!up.ok) return { ok: false, fieldErrors: { file: up.error } }
    filePath = up.path
  }

  const supabase = await createClient()
  const { error } = await supabase.from('pedagogical_resources').insert({
    school_id: schoolId,
    title: d.title,
    category: d.category,
    instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null,
    difficulty: d.difficulty,
    content_type: d.contentType,
    body: d.body || null,
    content_link: d.contentLink || null,
    description: d.description || null,
    file_path: filePath,
    created_by: me.id,
  })

  if (error) {
    if (filePath) await deleteResourceFile(filePath) // rollback do upload órfão
    return { ok: false, error: 'Não foi possível criar o recurso.' }
  }

  revalidatePath('/resources')
  redirect('/resources')
}

export async function updateResource(_prev: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const resourceId = String(formData.get('resourceId') ?? '')
  const parsed = resourceSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    instrumentCategory: formData.get('instrumentCategory') || '',
    instrument: formData.get('instrument') || undefined,
    difficulty: formData.get('difficulty'),
    contentType: formData.get('contentType'),
    body: formData.get('body') || undefined,
    contentLink: formData.get('contentLink') || '',
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const d = parsed.data
  const schoolId = me.role === 'superadmin' ? null : me.schoolId
  const supabase = await createClient()

  // Estado atual do arquivo, p/ decidir troca/remoção.
  const { data: existing } = await supabase
    .from('pedagogical_resources')
    .select('file_path')
    .eq('id', resourceId)
    .maybeSingle()

  let filePath: string | null = existing?.file_path ?? null
  const file = formData.get('file')
  if (file instanceof File && file.size > 0) {
    const up = await uploadResourceFile(file, schoolId)
    if (!up.ok) return { ok: false, fieldErrors: { file: up.error } }
    if (existing?.file_path) await deleteResourceFile(existing.file_path)
    filePath = up.path
  } else if (formData.get('removeFile') === 'on' && existing?.file_path) {
    await deleteResourceFile(existing.file_path)
    filePath = null
  }

  await supabase.from('pedagogical_resources').update({
    title: d.title, category: d.category, instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null, difficulty: d.difficulty, content_type: d.contentType,
    body: d.body || null, content_link: d.contentLink || null, description: d.description || null,
    file_path: filePath,
  }).eq('id', resourceId)

  revalidatePath('/resources')
  redirect('/resources')
}

export async function deleteResource(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const resourceId = String(formData.get('resourceId') ?? '')
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('pedagogical_resources')
    .select('file_path')
    .eq('id', resourceId)
    .maybeSingle()
  await supabase.from('pedagogical_resources').delete().eq('id', resourceId)
  if (existing?.file_path) await deleteResourceFile(existing.file_path)
  revalidatePath('/resources')
}

