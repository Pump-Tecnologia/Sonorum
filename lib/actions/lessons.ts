'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { notify } from '@/lib/notifications/notify'

export type LessonActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

const createLessonSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid().optional().or(z.literal('')),
  roomId: z.string().uuid().optional().or(z.literal('')),
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

type DbClient = Awaited<ReturnType<typeof createClient>>

// Verifica se a sala já tem uma aula (não cancelada) sobreposta ao intervalo.
async function roomHasConflict(
  supabase: DbClient,
  roomId: string,
  start: string,
  end: string,
  excludeId?: string,
): Promise<boolean> {
  let q = supabase
    .from('lessons')
    .select('id')
    .eq('room_id', roomId)
    .neq('status', 'canceled')
    .lt('start_datetime', end)
    .gt('end_datetime', start)
  if (excludeId) q = q.neq('id', excludeId)
  const { data } = await q.limit(1)
  return (data?.length ?? 0) > 0
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
    roomId: formData.get('roomId') || '',
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
  const roomId = d.roomId || null
  const supabase = await createClient()

  // Todas as ocorrências (aula principal + recorrência semanal).
  const occurrences: Array<[string, string]> = [[d.startDatetime, d.endDatetime]]
  if (d.repeatWeekly && d.recurrenceMode) {
    const extras = weeklyOccurrences(
      new Date(d.startDatetime),
      new Date(d.endDatetime),
      d.recurrenceMode,
      d.recurrenceUntil,
      d.recurrenceCount,
    )
    for (const [s, e] of extras) occurrences.push([s.toISOString(), e.toISOString()])
  }

  // Conflito de sala: nenhuma ocorrência pode cair numa sala já ocupada no
  // horário — inclui as datas da recorrência (não só a primeira aula).
  if (roomId) {
    for (const [s, e] of occurrences) {
      if (await roomHasConflict(supabase, roomId, s, e)) {
        const when = new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return { ok: false, error: `Essa sala já tem uma aula nesse horário (conflito em ${when}).` }
      }
    }
  }

  const toInsert = (start: string, end: string) => ({
    school_id: me.schoolId,
    student_id: d.studentId,
    teacher_id: teacherId,
    room_id: roomId,
    title: d.title,
    start_datetime: start,
    end_datetime: end,
    status: 'scheduled',
    notes: d.notes ?? null,
  })

  const { error } = await supabase.from('lessons').insert(occurrences.map(([s, e]) => toInsert(s, e)))
  if (error) return { ok: false, error: 'Não foi possível criar a aula.' }

  // Notifica só a 1ª ocorrência (recorrência manda só um aviso geral).
  const firstStart = new Date(occurrences[0][0])
  await notify('lesson.scheduled', d.studentId, {
    title: d.title,
    when: firstStart.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
  })

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

// Troca a sala de uma aula existente (planner) com checagem de conflito.
export async function updateLessonRoom(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return { ok: false, error: 'Acesso negado.' }

  const lessonId = String(formData.get('lessonId') ?? '')
  const roomId = String(formData.get('roomId') ?? '') || null
  if (!lessonId) return { ok: false, error: 'Aula inválida.' }

  const supabase = await createClient()

  if (roomId) {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('start_datetime, end_datetime')
      .eq('id', lessonId)
      .maybeSingle()
    if (lesson && (await roomHasConflict(supabase, roomId, lesson.start_datetime, lesson.end_datetime, lessonId))) {
      return { ok: false, error: 'Essa sala já está ocupada nesse horário.' }
    }
  }

  await supabase.from('lessons').update({ room_id: roomId }).eq('id', lessonId)
  revalidatePath(`/lessons/${lessonId}/planner`)
  revalidatePath('/schedule')
  return { ok: true }
}

export async function cancelLesson(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId) return
  const lessonId = String(formData.get('lessonId') ?? '')
  const supabase = await createClient()

  // Lê antes do update p/ ter dados pro template.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('student_id, start_datetime')
    .eq('id', lessonId)
    .maybeSingle()

  await supabase.from('lessons').update({ status: 'canceled' }).eq('id', lessonId)

  if (lesson) {
    await notify('lesson.canceled', lesson.student_id, {
      when: new Date(lesson.start_datetime).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }, { relatedId: lessonId })
  }

  revalidatePath('/schedule')
}

// Registro de presença na hora da aula — botões rápidos do planner.
// 'completed' = presente, 'late' = atrasado (conta como presença), 'missed' = faltou.
const ATTENDANCE_STATUSES = ['completed', 'late', 'missed'] as const

export async function markAttendance(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return

  const lessonId = String(formData.get('lessonId') ?? '')
  const status = String(formData.get('status') ?? '')
  const isValid = (ATTENDANCE_STATUSES as readonly string[]).includes(status)
  if (!lessonId || !isValid) return

  const supabase = await createClient()
  await supabase.from('lessons').update({ status }).eq('id', lessonId)

  revalidatePath('/schedule')
  revalidatePath('/teacher')
  revalidatePath(`/lessons/${lessonId}/planner`)
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
