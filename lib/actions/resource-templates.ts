'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { CATEGORIES, INST_CATEGORIES, DIFFICULTIES, CONTENT_TYPES } from '@/lib/constants/resources'

export type TemplateActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const templateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(CATEGORIES),
  instrumentCategory: z.enum(INST_CATEGORIES).optional().or(z.literal('')),
  instrument: z.string().max(255).optional(),
  difficulty: z.enum(DIFFICULTIES),
  contentType: z.enum(CONTENT_TYPES),
  body: z.string().optional(),
  contentLink: z.string().url('URL inválida').optional().or(z.literal('')),
})

function fe(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(Object.entries(error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? 'Inválido']))
}

async function requireSuperadmin() {
  const me = await getCurrentUser()
  return me?.role === 'superadmin' ? me : null
}

function parse(formData: FormData) {
  return templateSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    instrumentCategory: formData.get('instrumentCategory') || '',
    instrument: formData.get('instrument') || undefined,
    difficulty: formData.get('difficulty'),
    contentType: formData.get('contentType'),
    body: formData.get('body') || undefined,
    contentLink: formData.get('contentLink') || '',
  })
}

function toRow(d: z.infer<typeof templateSchema>) {
  return {
    title: d.title,
    description: d.description || null,
    category: d.category,
    instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null,
    difficulty: d.difficulty,
    content_type: d.contentType,
    body: d.body || null,
    content_link: d.contentLink || null,
  }
}

export async function createTemplate(_prev: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  if (!(await requireSuperadmin())) return { ok: false, error: 'Acesso negado.' }
  const parsed = parse(formData)
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from('resource_templates').insert(toRow(parsed.data))
  if (error) return { ok: false, error: 'Não foi possível criar o recurso.' }

  revalidatePath('/superadmin/biblioteca')
  return { ok: true }
}

export async function updateTemplate(_prev: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  if (!(await requireSuperadmin())) return { ok: false, error: 'Acesso negado.' }
  const id = String(formData.get('templateId') ?? '')
  const parsed = parse(formData)
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const supabase = await createClient()
  // Bump de versão: sinaliza às escolas que há atualização do template.
  const { data: current } = await supabase.from('resource_templates').select('version').eq('id', id).maybeSingle()
  const nextVersion = (current?.version ?? 1) + 1

  const { error } = await supabase
    .from('resource_templates')
    .update({ ...toRow(parsed.data), version: nextVersion })
    .eq('id', id)
  if (error) return { ok: false, error: 'Não foi possível atualizar o recurso.' }

  revalidatePath('/superadmin/biblioteca')
  return { ok: true }
}

export async function deleteTemplate(formData: FormData) {
  if (!(await requireSuperadmin())) return
  const id = String(formData.get('templateId') ?? '')
  if (!id) return
  const supabase = await createClient()
  // Cópias nas escolas mantêm-se (template_id vira NULL via FK ON DELETE SET NULL).
  await supabase.from('resource_templates').delete().eq('id', id)
  revalidatePath('/superadmin/biblioteca')
}

// ── Provisionamento: copia os templates ativos p/ a escola (só os que faltam) ──
export async function provisionSchoolLibrary(schoolId: string): Promise<number> {
  const admin = await createAdminClient()

  const [{ data: templates }, { data: existing }] = await Promise.all([
    admin.from('resource_templates').select('*').eq('active', true),
    admin.from('pedagogical_resources').select('template_id').eq('school_id', schoolId).not('template_id', 'is', null),
  ])
  if (!templates?.length) return 0

  const have = new Set((existing ?? []).map((r) => r.template_id))
  const toCopy = templates.filter((t) => !have.has(t.id))
  if (!toCopy.length) return 0

  const rows = toCopy.map((t) => ({
    school_id: schoolId,
    title: t.title,
    description: t.description,
    category: t.category ?? 'Aquecimento',
    instrument_category: t.instrument_category,
    instrument: t.instrument,
    difficulty: t.difficulty ?? 'Iniciante',
    content_type: t.content_type,
    body: t.body,
    file_path: t.file_path,
    content_link: t.content_link,
    template_id: t.id,
    template_version: t.version,
    customized: false,
  }))
  const { error } = await admin.from('pedagogical_resources').insert(rows)
  if (error) return 0
  return rows.length
}

// Superadmin: empurra o catálogo p/ todas as escolas (só o que falta em cada).
export async function provisionAllSchools() {
  if (!(await requireSuperadmin())) return
  const admin = await createAdminClient()
  const { data: schools } = await admin.from('schools').select('id')
  for (const s of schools ?? []) {
    await provisionSchoolLibrary(s.id)
  }
  revalidatePath('/superadmin/biblioteca')
}
