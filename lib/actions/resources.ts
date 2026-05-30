'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { CATEGORIES, INST_CATEGORIES, DIFFICULTIES, CONTENT_TYPES } from '@/lib/constants/resources'

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
  const supabase = await createClient()
  const { error } = await supabase.from('pedagogical_resources').insert({
    school_id: me.role === 'superadmin' ? null : me.schoolId,
    title: d.title,
    category: d.category,
    instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null,
    difficulty: d.difficulty,
    content_type: d.contentType,
    body: d.body || null,
    content_link: d.contentLink || null,
    description: d.description || null,
    created_by: me.id,
  })

  if (error) return { ok: false, error: 'Não foi possível criar o recurso.' }

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
  const supabase = await createClient()
  await supabase.from('pedagogical_resources').update({
    title: d.title, category: d.category, instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null, difficulty: d.difficulty, content_type: d.contentType,
    body: d.body || null, content_link: d.contentLink || null, description: d.description || null,
  }).eq('id', resourceId)

  revalidatePath('/resources')
  redirect('/resources')
}

export async function deleteResource(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const resourceId = String(formData.get('resourceId') ?? '')
  const supabase = await createClient()
  await supabase.from('pedagogical_resources').delete().eq('id', resourceId)
  revalidatePath('/resources')
}

