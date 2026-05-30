'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export type LessonActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

const createLessonSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(1).max(255),
  startDatetime: z.string().datetime({ local: true }).or(z.string().min(1)),
  endDatetime: z.string().datetime({ local: true }).or(z.string().min(1)),
  notes: z.string().optional(),
  repeatWeekly: z.coerce.boolean().default(false),
  recurrenceMode: z.enum(['until', 'count']).optional(),
  recurrenceUntil: z.string().optional(),
  recurrenceCount: z.coerce.number().int().min(1).max(52).optional(),
})

// Gera datas recorrentes semanais a partir de um par início/fim
function weeklyOccurrences(
  start: Date,
  end: Date,
  mode: 'until' | 'count',
  until?: string,
  count?: number,
): Array<[Date, Date]> {
  const result: Array<[Date, Date]> = []
  let cur = new Date(start)
  let curEnd = new Date(end)

  for (let i = 1; i <= 52; i++) {
    cur = new Date(cur.getTime() + 7 * 24 * 60 * 60 * 1000)
    curEnd = new Date(curEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (mode === 'count' && count && i >= count) break
    if (mode === 'until' && until && cur > new Date(until)) break
    result.push([new Date(cur), new Date(curEnd)])
  }
  return result
}

export async function createLesson(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role))
    return { ok: false, error: 'Acesso negado.' }

  const parsed = createLessonSchema.safeParse({
    studentId: formData.get('studentId'),
    teacherId: formData.get('teacherId') || '',
    title: formData.get('title'),
    startDatetime: formData.get('startDatetime'),
    endDatetime: formData.get('endDatetime'),
    notes: formData.get('notes') || undefined,
    repeatWeekly: formData.get('repeatWeekly'),
    recurrenceMode: formData.get('recurrenceMode') || undefined,
    recurrenceUntil: formData.get('recurrenceUntil') || undefined,
    recurrenceCount: formData.get('recurrenceCount') || undefined,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])) }
  }

  const d = parsed.data
  const teacherId = me.role === 'teacher' ? me.id : (d.teacherId || null)
  const supabase = await createClient()

  const toInsert = (start: string, end: string) => ({
    school_id: me.schoolId,
    student_id: d.studentId,
    teacher_id: teacherId,
    title: d.title,
    start_datetime: start,
    end_datetime: end,
    status: 'scheduled',
    notes: d.notes ?? null,
  })

  // Insert primeira aula
  const { error } = await supabase.from('lessons').insert(toInsert(d.startDatetime, d.endDatetime))
  if (error) return { ok: false, error: 'Não foi possível criar a aula.' }

  // Recorrência semanal
  if (d.repeatWeekly && d.recurrenceMode) {
    const extras = weeklyOccurrences(
      new Date(d.startDatetime),
      new Date(d.endDatetime),
      d.recurrenceMode,
      d.recurrenceUntil,
      d.recurrenceCount,
    )
    if (extras.length > 0) {
      await supabase.from('lessons').insert(
        extras.map(([s, e]) => toInsert(s.toISOString(), e.toISOString())),
      )
    }
  }

  revalidatePath('/schedule')
  return { ok: true }
}

// Atualiza status / notas / notas privadas
export async function updateLesson(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId) return

  const lessonId = String(formData.get('lessonId') ?? '')
  const supabase = await createClient()

  type LessonUpdate = {
    status?: string
    notes?: string | null
    goals?: string | null
    private_notes?: string | null
  }
  const updates: LessonUpdate = {}
  if (formData.has('status')) updates.status = String(formData.get('status'))
  if (formData.has('notes')) updates.notes = String(formData.get('notes')) || null
  if (formData.has('goals')) updates.goals = String(formData.get('goals')) || null
  if (formData.has('private_notes')) updates.private_notes = String(formData.get('private_notes')) || null

  if (Object.keys(updates).length > 0) {
    await supabase.from('lessons').update(updates).eq('id', lessonId)
  }

  // Relatório de desempenho
  if (formData.has('technique_score')) {
    const report = {
      school_id: me.schoolId,
      lesson_id: lessonId,
      technique_score: Number(formData.get('technique_score')),
      theory_score: Number(formData.get('theory_score')),
      repertoire_score: Number(formData.get('repertoire_score')),
      practice_score: Number(formData.get('practice_score')),
      current_song: String(formData.get('current_song') ?? '') || null,
      initial_bpm: formData.get('initial_bpm') ? Number(formData.get('initial_bpm')) : null,
      reached_bpm: formData.get('reached_bpm') ? Number(formData.get('reached_bpm')) : null,
    }
    await supabase
      .from('lesson_reports')
      .upsert(report, { onConflict: 'lesson_id' })
  }

  revalidatePath('/schedule')
  revalidatePath(`/lessons/${lessonId}/planner`)
}

export async function cancelLesson(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId) return
  const lessonId = String(formData.get('lessonId') ?? '')
  const supabase = await createClient()
  await supabase.from('lessons').update({ status: 'canceled' }).eq('id', lessonId)
  revalidatePath('/schedule')
}

// ── Lesson Plan (warmup/repertoire/homework/target_bpm) ─────────────────────
export async function upsertLessonPlan(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return

  const lessonId = String(formData.get('lessonId') ?? '')
  const supabase = await createClient()

  const plan = {
    school_id: me.schoolId,
    lesson_id: lessonId,
    warmup: String(formData.get('warmup') ?? '') || null,
    repertoire: String(formData.get('repertoire') ?? '') || null,
    homework: String(formData.get('homework') ?? '') || null,
    target_bpm: String(formData.get('target_bpm') ?? '') || null,
    notes: String(formData.get('plan_notes') ?? '') || null,
  }

  await supabase.from('lesson_plans').upsert(plan, { onConflict: 'lesson_id' })
  revalidatePath(`/lessons/${lessonId}/planner`)
}

// ── Anexar / desanexar recursos pedagógicos à aula ───────────────────────────
export async function attachResource(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return

  const lessonId = String(formData.get('lessonId') ?? '')
  const resourceId = String(formData.get('resourceId') ?? '')
  const section = String(formData.get('section') ?? 'general')

  if (!lessonId || !resourceId) return

  const supabase = await createClient()

  // Evita duplicata (lesson + resource + section)
  const { data: existing } = await supabase
    .from('lesson_pedagogical_resource')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('pedagogical_resource_id', resourceId)
    .eq('section', section)
    .maybeSingle()

  if (existing) return

  await supabase.from('lesson_pedagogical_resource').insert({
    lesson_id: lessonId,
    pedagogical_resource_id: resourceId,
    section,
  })
  revalidatePath(`/lessons/${lessonId}/planner`)
}

export async function detachResource(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return

  const pivotId = String(formData.get('pivotId') ?? '')
  const lessonId = String(formData.get('lessonId') ?? '')

  if (!pivotId) return

  const supabase = await createClient()
  await supabase.from('lesson_pedagogical_resource').delete().eq('id', pivotId)
  revalidatePath(`/lessons/${lessonId}/planner`)
}
