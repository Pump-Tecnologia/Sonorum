'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { notify } from '@/lib/notifications/notify'
import { RECURRENCE_PRESETS, presetWeeks } from '@/lib/constants/recurrence'
import { localBrToServerISO } from '@/lib/timezone'

export type LessonActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

const RECURRENCE_PRESET_KEYS = Object.keys(RECURRENCE_PRESETS) as [keyof typeof RECURRENCE_PRESETS, ...Array<keyof typeof RECURRENCE_PRESETS>]

const createLessonSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid().optional().or(z.literal('')),
  roomId: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(1).max(255),
  startDatetime: z.string().datetime({ local: true }).or(z.string().min(1)),
  endDatetime: z.string().datetime({ local: true }).or(z.string().min(1)),
  notes: z.string().optional(),
  // Preset único: substitui o trio repeatWeekly/recurrenceMode/recurrenceCount.
  // 'none' = aula única; demais = N semanas (definido em RECURRENCE_PRESETS).
  recurrence: z.enum(RECURRENCE_PRESET_KEYS).default('none'),
})

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
    recurrence: formData.get('recurrence') || 'none',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])) }
  }

  const d = parsed.data
  // Professor: teacher cria → vincula a si; admin → seleção obrigatória.
  if (me.role === 'admin' && !d.teacherId) {
    return { ok: false, fieldErrors: { teacherId: 'Selecione o professor da aula.' } }
  }
  const teacherId = me.role === 'teacher' ? me.id : (d.teacherId || null)
  const roomId = d.roomId || null
  const supabase = await createClient()

  // CORREÇÃO DE FUSO: <input type="datetime-local"> não envia offset, e o
  // Postgres trataria a string como UTC — uma aula 'das 14:00' viraria
  // '14:00 UTC = 11:00 BRT'. Anexamos BRT (-03:00) p/ o instante gravado
  // corresponder ao horário que o usuário digitou.
  const startISO = localBrToServerISO(d.startDatetime)
  const endISO = localBrToServerISO(d.endDatetime)
  if (new Date(endISO) <= new Date(startISO)) {
    return { ok: false, fieldErrors: { endDatetime: 'O fim precisa ser depois do início.' } }
  }

  // Cross-tenant: aluno/professor/sala precisam ser da MESMA escola do user.
  // RLS protege o INSERT (school_id colado é o meu), mas sem essa checagem
  // dá pra criar uma aula apontando aluno/prof/sala de outra escola.
  const [studentCheck, teacherCheck, roomCheck] = await Promise.all([
    supabase.from('users').select('id').eq('id', d.studentId).eq('school_id', me.schoolId).eq('role', 'student').maybeSingle(),
    teacherId
      ? supabase.from('users').select('id').eq('id', teacherId).eq('school_id', me.schoolId).eq('role', 'teacher').maybeSingle()
      : Promise.resolve({ data: 'skip' as const }),
    roomId
      ? supabase.from('rooms').select('id').eq('id', roomId).eq('school_id', me.schoolId).maybeSingle()
      : Promise.resolve({ data: 'skip' as const }),
  ])
  if (!studentCheck.data) return { ok: false, fieldErrors: { studentId: 'Aluno não encontrado na escola.' } }
  if (teacherCheck.data === null) return { ok: false, fieldErrors: { teacherId: 'Professor não encontrado na escola.' } }
  if (roomCheck.data === null) return { ok: false, fieldErrors: { roomId: 'Sala não encontrada na escola.' } }

  // Todas as ocorrências (aula principal + recorrência semanal por preset).
  const weeksExtra = presetWeeks(d.recurrence)
  const occurrences: Array<[string, string]> = [[startISO, endISO]]
  const startMs = new Date(startISO).getTime()
  const endMs = new Date(endISO).getTime()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  for (let i = 1; i <= weeksExtra; i++) {
    occurrences.push([
      new Date(startMs + i * weekMs).toISOString(),
      new Date(endMs + i * weekMs).toISOString(),
    ])
  }
  // Série tem UUID estável quando há recorrência (permite editar/cancelar
  // a série inteira ou só as próximas a partir de uma ocorrência).
  const seriesId = weeksExtra > 0 ? crypto.randomUUID() : null

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
    series_id: seriesId,
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

// Edita horário/sala/professor de uma aula existente (planner).
// Aceita campos opcionais: só atualiza o que foi enviado no form.
// apply='future' propaga a mudança p/ todas as ocorrências FUTURAS da
// mesma série (mantém o desvio relativo no horário) — útil quando o
// aluno muda o dia/horário da aula semanal a partir de uma data.
const updateScheduleSchema = z.object({
  lessonId: z.string().uuid(),
  startDatetime: z.string().min(1).optional(),
  endDatetime: z.string().min(1).optional(),
  roomId: z.string().uuid().optional().or(z.literal('')).or(z.literal('clear')),
  teacherId: z.string().uuid().optional().or(z.literal('')).or(z.literal('clear')),
  apply: z.enum(['this', 'future']).default('this'),
})

export async function updateLessonSchedule(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return { ok: false, error: 'Acesso negado.' }

  const parsed = updateScheduleSchema.safeParse({
    lessonId: formData.get('lessonId'),
    startDatetime: formData.get('startDatetime') || undefined,
    endDatetime: formData.get('endDatetime') || undefined,
    roomId: formData.get('roomId') ?? undefined,
    teacherId: formData.get('teacherId') ?? undefined,
    apply: formData.get('apply') || 'this',
  })
  if (!parsed.success) return { ok: false, error: 'Dados inválidos.' }
  const d = parsed.data

  const supabase = await createClient()
  // Lê o estado atual da aula p/ preencher campos faltantes (necessário p/
  // validar conflito de sala mesmo quando só o horário muda, e vice-versa).
  const { data: lesson } = await supabase
    .from('lessons')
    .select('start_datetime, end_datetime, room_id, teacher_id, school_id, series_id')
    .eq('id', d.lessonId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!lesson) return { ok: false, error: 'Aula não encontrada.' }

  type LessonUpdate = {
    start_datetime?: string; end_datetime?: string
    room_id?: string | null; teacher_id?: string | null
  }
  const update: LessonUpdate = {}

  // Horário (com correção de fuso e validação start<end).
  let nextStart = lesson.start_datetime
  let nextEnd = lesson.end_datetime
  if (d.startDatetime) { nextStart = localBrToServerISO(d.startDatetime); update.start_datetime = nextStart }
  if (d.endDatetime) { nextEnd = localBrToServerISO(d.endDatetime); update.end_datetime = nextEnd }
  if (new Date(nextEnd) <= new Date(nextStart)) {
    return { ok: false, fieldErrors: { endDatetime: 'O fim precisa ser depois do início.' } }
  }

  // Sala: '' / 'clear' = remover; uuid = nova sala. Valida cross-tenant + conflito.
  let nextRoom: string | null = lesson.room_id
  if (d.roomId !== undefined) {
    if (!d.roomId || d.roomId === 'clear') {
      nextRoom = null
    } else {
      const { data: r } = await supabase.from('rooms').select('id').eq('id', d.roomId).eq('school_id', me.schoolId).maybeSingle()
      if (!r) return { ok: false, fieldErrors: { roomId: 'Sala não encontrada na escola.' } }
      nextRoom = d.roomId
    }
    update.room_id = nextRoom
  }
  if (nextRoom && (await roomHasConflict(supabase, nextRoom, nextStart, nextEnd, d.lessonId))) {
    return { ok: false, fieldErrors: { roomId: 'Essa sala já está ocupada nesse horário.' } }
  }

  // Professor: '' / 'clear' = remover; uuid = novo professor.
  if (d.teacherId !== undefined) {
    if (!d.teacherId || d.teacherId === 'clear') {
      update.teacher_id = null
    } else {
      const { data: t } = await supabase.from('users').select('id').eq('id', d.teacherId).eq('school_id', me.schoolId).eq('role', 'teacher').maybeSingle()
      if (!t) return { ok: false, fieldErrors: { teacherId: 'Professor não encontrado na escola.' } }
      update.teacher_id = d.teacherId
    }
  }

  if (Object.keys(update).length === 0) return { ok: true }

  // Propagação p/ futuras ocorrências da série: aplica o MESMO delta de
  // tempo em todas as aulas com mesmo series_id cujo start_datetime >= esta.
  // Sala/professor são aplicados como valores absolutos (todas viram o
  // mesmo). Conflito de sala é checado por ocorrência.
  if (d.apply === 'future' && lesson.series_id) {
    const startDeltaMs = update.start_datetime ? new Date(update.start_datetime).getTime() - new Date(lesson.start_datetime).getTime() : 0
    const endDeltaMs = update.end_datetime ? new Date(update.end_datetime).getTime() - new Date(lesson.end_datetime).getTime() : 0

    const { data: siblings } = await supabase
      .from('lessons')
      .select('id, start_datetime, end_datetime, room_id')
      .eq('series_id', lesson.series_id)
      .eq('school_id', me.schoolId)
      .gte('start_datetime', lesson.start_datetime)
      .neq('status', 'canceled')

    // Pré-checa conflito de sala em todas as futuras (com horário novo).
    if (nextRoom) {
      for (const s of siblings ?? []) {
        const newStart = new Date(new Date(s.start_datetime).getTime() + startDeltaMs).toISOString()
        const newEnd = new Date(new Date(s.end_datetime).getTime() + endDeltaMs).toISOString()
        if (await roomHasConflict(supabase, nextRoom, newStart, newEnd, s.id)) {
          const when = new Date(newStart).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          return { ok: false, fieldErrors: { roomId: `Conflito de sala em ${when}.` } }
        }
      }
    }

    // Aplica em cada sibling (não dá pra fazer um único UPDATE pq cada um
    // tem horário próprio + delta). Lote de UPDATEs.
    for (const s of siblings ?? []) {
      const sibUpdate: LessonUpdate = { ...update }
      if (update.start_datetime) sibUpdate.start_datetime = new Date(new Date(s.start_datetime).getTime() + startDeltaMs).toISOString()
      if (update.end_datetime) sibUpdate.end_datetime = new Date(new Date(s.end_datetime).getTime() + endDeltaMs).toISOString()
      await supabase.from('lessons').update(sibUpdate).eq('id', s.id).eq('school_id', me.schoolId)
    }
  } else {
    const { error } = await supabase.from('lessons').update(update).eq('id', d.lessonId).eq('school_id', me.schoolId)
    if (error) return { ok: false, error: 'Não foi possível atualizar a aula.' }
  }

  revalidatePath(`/lessons/${d.lessonId}/planner`)
  revalidatePath('/schedule')
  return { ok: true }
}

// Cancela todas as aulas FUTURAS de uma série a partir desta (incluída).
export async function cancelLessonSeries(formData: FormData) {
  const me = await getCurrentUser()
  if (!me?.schoolId || !['admin', 'teacher'].includes(me.role)) return
  const lessonId = String(formData.get('lessonId') ?? '')
  if (!lessonId) return

  const supabase = await createClient()
  const { data: lesson } = await supabase
    .from('lessons')
    .select('series_id, start_datetime')
    .eq('id', lessonId)
    .eq('school_id', me.schoolId)
    .maybeSingle()
  if (!lesson?.series_id) return

  await supabase
    .from('lessons')
    .update({ status: 'canceled' })
    .eq('series_id', lesson.series_id)
    .eq('school_id', me.schoolId)
    .gte('start_datetime', lesson.start_datetime)
    .neq('status', 'canceled')

  revalidatePath('/schedule')
  revalidatePath(`/lessons/${lessonId}/planner`)
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
