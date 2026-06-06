'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { INST_CATEGORIES } from '@/lib/constants/resources'
import { createClient } from '@/lib/supabase/server'

export type TemplateActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const templateSchema = z.object({
  name: z.string().min(1, 'Dê um nome ao modelo.').max(255),
  instrumentCategory: z.enum(INST_CATEGORIES).optional().or(z.literal('')),
  instrument: z.string().max(255).optional().or(z.literal('')),
  goals: z.string().optional(),
  warmupNote: z.string().optional(),
  repertoireNote: z.string().optional(),
  homeworkNote: z.string().optional(),
  targetBpm: z.string().max(60).optional(),
})

function fe(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
  )
}

async function requireStaff() {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return null
  return { ...me, schoolId: me.schoolId }
}

function parseForm(formData: FormData) {
  return templateSchema.safeParse({
    name: formData.get('name'),
    instrumentCategory: formData.get('instrumentCategory') || '',
    instrument: formData.get('instrument') || '',
    goals: formData.get('goals') || undefined,
    warmupNote: formData.get('warmupNote') || undefined,
    repertoireNote: formData.get('repertoireNote') || undefined,
    homeworkNote: formData.get('homeworkNote') || undefined,
    targetBpm: formData.get('targetBpm') || undefined,
  })
}

function toRow(d: z.infer<typeof templateSchema>) {
  return {
    name: d.name,
    instrument_category: d.instrumentCategory || null,
    instrument: d.instrument || null,
    goals: d.goals || null,
    warmup_note: d.warmupNote || null,
    repertoire_note: d.repertoireNote || null,
    homework_note: d.homeworkNote || null,
    target_bpm: d.targetBpm || null,
  }
}

export async function createLessonPlanTemplate(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = parseForm(formData)
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lesson_plan_templates')
    .insert({ ...toRow(parsed.data), school_id: me.schoolId, created_by: me.id })
  if (error) return { ok: false, error: 'Não foi possível criar o modelo.' }

  revalidatePath('/modelos')
  redirect('/modelos')
}

export async function updateLessonPlanTemplate(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const templateId = String(formData.get('templateId') ?? '')
  if (!templateId) return { ok: false, error: 'Modelo inválido.' }

  const parsed = parseForm(formData)
  if (!parsed.success) return { ok: false, fieldErrors: fe(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lesson_plan_templates')
    .update(toRow(parsed.data))
    .eq('id', templateId)
    .eq('school_id', me.schoolId)
  if (error) return { ok: false, error: 'Não foi possível salvar o modelo.' }

  revalidatePath('/modelos')
  redirect('/modelos')
}

export async function deleteLessonPlanTemplate(formData: FormData) {
  const me = await requireStaff()
  if (!me) return
  const templateId = String(formData.get('templateId') ?? '')
  if (!templateId) return

  const supabase = await createClient()
  await supabase.from('lesson_plan_templates').delete().eq('id', templateId).eq('school_id', me.schoolId)
  revalidatePath('/modelos')
}

// Aplica um modelo a uma aula: pré-preenche objetivos + notas por seção + BPM.
// SUBSTITUI o planejamento textual atual (recursos anexados não são tocados).
export async function applyTemplateToLesson(
  input: { lessonId: string; templateId: string },
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const lessonId = String(input.lessonId ?? '')
  const templateId = String(input.templateId ?? '')
  if (!lessonId || !templateId) return { ok: false, error: 'Dados inválidos.' }

  const supabase = await createClient()

  const { data: tpl } = await supabase
    .from('lesson_plan_templates')
    .select('goals, warmup_note, repertoire_note, homework_note, target_bpm')
    .eq('id', templateId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!tpl) return { ok: false, error: 'Modelo não encontrado.' }

  // Confirma que a aula é da escola do staff.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!lesson) return { ok: false, error: 'Aula não encontrada.' }

  // Aplica o PLANO primeiro (conteúdo principal); só depois os objetivos — assim
  // uma falha no plano não deixa os objetivos alterados sem plano correspondente.
  // Aplicar SUBSTITUI o plano: grava as colunas legadas e LIMPA o envelope
  // specific_data, para que readPlanContent hidrate do que o modelo escreveu
  // (senão o envelope antigo teria precedência e o modelo não apareceria).
  const { error } = await supabase.from('lesson_plans').upsert(
    {
      school_id: me.schoolId,
      lesson_id: lessonId,
      warmup: tpl.warmup_note || null,
      repertoire: tpl.repertoire_note || null,
      homework: tpl.homework_note || null,
      target_bpm: tpl.target_bpm || null,
      specific_data: null,
    },
    { onConflict: 'lesson_id' },
  )
  if (error) return { ok: false, error: 'Não foi possível aplicar o modelo.' }

  const { error: goalsError } = await supabase
    .from('lessons')
    .update({ goals: tpl.goals || null })
    .eq('id', lessonId)
    .eq('school_id', me.schoolId)
  if (goalsError) return { ok: false, error: 'Modelo aplicado, mas não foi possível atualizar os objetivos.' }

  revalidatePath(`/lessons/${lessonId}/planner`)
  return { ok: true }
}

// Salva o planejamento ATUAL (salvo no banco) de uma aula como um novo modelo.
export async function saveLessonAsTemplate(
  input: { lessonId: string; name: string },
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const lessonId = String(input.lessonId ?? '')
  const name = String(input.name ?? '').trim()
  if (!lessonId) return { ok: false, error: 'Aula inválida.' }
  if (!name) return { ok: false, error: 'Dê um nome ao modelo.' }

  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('goals, school_id, users!lessons_student_id_fkey(instrument, instrument_category)')
    .eq('id', lessonId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!lesson) return { ok: false, error: 'Aula não encontrada.' }

  const { data: plan } = await supabase
    .from('lesson_plans')
    .select('warmup, repertoire, homework, target_bpm')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const student = lesson.users as { instrument: unknown; instrument_category: string | null } | null
  const rawInstrument = student?.instrument
  const instrument = Array.isArray(rawInstrument)
    ? (rawInstrument[0] != null ? String(rawInstrument[0]) : null)
    : (typeof rawInstrument === 'string' && rawInstrument ? rawInstrument : null)

  const { error } = await supabase.from('lesson_plan_templates').insert({
    school_id: me.schoolId,
    created_by: me.id,
    name,
    instrument_category: student?.instrument_category || null,
    instrument,
    goals: lesson.goals || null,
    warmup_note: plan?.warmup || null,
    repertoire_note: plan?.repertoire || null,
    homework_note: plan?.homework || null,
    target_bpm: plan?.target_bpm || null,
  })
  if (error) return { ok: false, error: 'Não foi possível salvar o modelo.' }

  revalidatePath('/modelos')
  return { ok: true }
}
