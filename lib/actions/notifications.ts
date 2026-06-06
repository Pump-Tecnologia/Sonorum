'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { notify } from '@/lib/notifications/notify'
import type { NotificationEvent } from '@/lib/notifications/types'
import { getStudentProgress } from '@/lib/data/progress'
import { appBaseUrl } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

export type NotifyActionState = {
  ok: boolean
  error?: string
  // Links wa.me que o componente client deve abrir (target=_blank).
  whatsappLinks?: Array<{ to: string; name: string | null; url: string }>
}

async function requireStaff() {
  const me = await getCurrentUser()
  return me?.schoolId && ['admin', 'teacher'].includes(me.role) ? me : null
}

const CHARGE_EVENTS = new Set<NotificationEvent>(['charge.created', 'charge.due_soon', 'charge.overdue', 'charge.paid'])

// Envia ao aluno (e/ou responsável) o relatório de progresso do mês: resume
// aulas, frequência e metas via e-mail + WhatsApp. Reaproveita getStudentProgress.
export async function sendStudentReport(
  _prev: NotifyActionState,
  formData: FormData,
): Promise<NotifyActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const studentId = String(formData.get('studentId') ?? '')
  if (!studentId) return { ok: false, error: 'Aluno inválido.' }

  // Confirma que o aluno é da escola do staff.
  const admin = await createAdminClient()
  const { data: student } = await admin
    .from('users')
    .select('id, school_id, role')
    .eq('id', studentId)
    .maybeSingle()
  if (!student || student.role !== 'student' || student.school_id !== me.schoolId) {
    return { ok: false, error: 'Aluno não encontrado.' }
  }

  // Mês-calendário corrente, em BRT (-03:00), pra os números baterem com o rótulo.
  const now = new Date()
  const y = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  const range = {
    from: `${y}-${mm}-01T00:00:00-03:00`,
    to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999-03:00`,
  }
  const progress = await getStudentProgress(studentId, range)
  if (!progress.hasData) {
    return { ok: false, error: 'Sem aulas registradas neste mês para gerar o relatório.' }
  }

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const result = await notify('progress.monthly_report', studentId, {
    monthLabel,
    lessonsDone: progress.lessonsCount,
    attendanceRate: progress.attendance.rate,
    goalsDone: progress.goals.completed,
    goalsTotal: progress.goals.total,
  })

  return { ok: true, whatsappLinks: result.whatsapp.links }
}

// Manda lembrete/aviso de uma cobrança específica. O 'kind' decide o template.
export async function notifyCharge(
  _prev: NotifyActionState,
  formData: FormData,
): Promise<NotifyActionState> {
  if (!(await requireStaff())) return { ok: false, error: 'Acesso negado.' }
  const chargeId = String(formData.get('chargeId') ?? '')
  const kind = String(formData.get('kind') ?? 'charge.due_soon') as NotificationEvent
  if (!chargeId || !CHARGE_EVENTS.has(kind)) return { ok: false, error: 'Cobrança inválida.' }

  const admin = await createAdminClient()
  const { data: charge } = await admin
    .from('charges')
    .select('id, amount, due_date, payment_method, description, student_id, enrollment:enrollments(student_id, plan:plans(name))')
    .eq('id', chargeId)
    .maybeSingle()

  const enr = charge?.enrollment as { student_id: string; plan: { name: string } | null } | null
  // Resolve o aluno via matrícula (plano) ou direto (cobrança avulsa).
  const studentId = enr?.student_id ?? charge?.student_id ?? null
  if (!charge || !studentId) return { ok: false, error: 'Cobrança não encontrada.' }

  const dueDate = new Date(charge.due_date + 'T12:00:00')
  const today = new Date()
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  const result = await notify(kind, studentId, {
    amount: Number(charge.amount),
    dueDate: dueDate.toLocaleDateString('pt-BR'),
    daysLeft,
    planName: enr?.plan?.name ?? charge.description ?? null,
    paymentMethod: charge.payment_method,
    payUrl: `${appBaseUrl()}/pagar/${chargeId}`,
  }, { relatedId: chargeId })

  revalidatePath('/financial')
  return { ok: true, whatsappLinks: result.whatsapp.links }
}

// Envia ao aluno o RELATÓRIO DA AULA (notas por habilidade, música, BPM,
// observações). Recurso de Relatórios — exclusivo dos planos com a feature.
export async function sendLessonReport(
  _prev: NotifyActionState,
  formData: FormData,
): Promise<NotifyActionState> {
  const me = await requireStaff()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const { getPlanContext } = await import('@/lib/auth/plan')
  const { features } = await getPlanContext()
  if (!features.reports) return { ok: false, error: 'Envio de relatórios disponível em planos pagos.' }

  const lessonId = String(formData.get('lessonId') ?? '')
  if (!lessonId) return { ok: false, error: 'Aula inválida.' }

  const admin = await createAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, title, start_datetime, notes, student_id, school_id, report:lesson_reports(technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm)')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson || lesson.school_id !== me.schoolId) return { ok: false, error: 'Aula não encontrada.' }
  const report = (Array.isArray(lesson.report) ? lesson.report[0] : lesson.report) as
    | { technique_score: number; theory_score: number; repertoire_score: number; practice_score: number; current_song: string | null; initial_bpm: number | null; reached_bpm: number | null }
    | null
  if (!report) return { ok: false, error: 'Preencha o relatório da aula antes de enviar.' }

  const lessonDate = new Date(lesson.start_datetime).toLocaleDateString('pt-BR')
  const bpm = report.initial_bpm && report.reached_bpm ? `${report.initial_bpm} → ${report.reached_bpm}` : null

  const result = await notify('lesson.report', lesson.student_id, {
    lessonTitle: lesson.title,
    lessonDate,
    technique: report.technique_score,
    theory: report.theory_score,
    repertoire: report.repertoire_score,
    practice: report.practice_score,
    currentSong: report.current_song,
    bpm,
    notes: lesson.notes ?? null,
  }, { relatedId: lessonId })

  revalidatePath(`/lessons/${lessonId}/planner`)
  revalidatePath('/admin/reports')
  return { ok: true, whatsappLinks: result.whatsapp.links }
}

const LESSON_EVENTS = new Set<NotificationEvent>(['lesson.scheduled', 'lesson.tomorrow', 'lesson.canceled', 'lesson.rescheduled'])

// Manda lembrete/aviso de uma aula específica.
export async function notifyLesson(
  _prev: NotifyActionState,
  formData: FormData,
): Promise<NotifyActionState> {
  if (!(await requireStaff())) return { ok: false, error: 'Acesso negado.' }
  const lessonId = String(formData.get('lessonId') ?? '')
  const kind = String(formData.get('kind') ?? 'lesson.tomorrow') as NotificationEvent
  if (!lessonId || !LESSON_EVENTS.has(kind)) return { ok: false, error: 'Aula inválida.' }

  const admin = await createAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, title, start_datetime, student_id, room:rooms(name), teacher:users!lessons_teacher_id_fkey(name)')
    .eq('id', lessonId)
    .maybeSingle()
  if (!lesson) return { ok: false, error: 'Aula não encontrada.' }

  const start = new Date(lesson.start_datetime)
  const when = start.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const time = start.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  const room = (lesson.room as { name: string } | null)?.name ?? null
  const teacherName = (lesson.teacher as { name: string } | null)?.name ?? null

  const result = await notify(kind, lesson.student_id, {
    title: lesson.title,
    when,
    time,
    room,
    teacherName,
  }, { relatedId: lessonId })

  revalidatePath('/schedule')
  return { ok: true, whatsappLinks: result.whatsapp.links }
}
