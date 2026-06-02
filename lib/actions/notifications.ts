'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { notify } from '@/lib/notifications/notify'
import type { NotificationEvent } from '@/lib/notifications/types'
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
    .select('id, amount, due_date, payment_method, enrollment:enrollments(student_id, plan:plans(name))')
    .eq('id', chargeId)
    .maybeSingle()

  const enr = charge?.enrollment as { student_id: string; plan: { name: string } | null } | null
  if (!charge || !enr) return { ok: false, error: 'Cobrança não encontrada.' }

  const dueDate = new Date(charge.due_date + 'T12:00:00')
  const today = new Date()
  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  const result = await notify(kind, enr.student_id, {
    amount: Number(charge.amount),
    dueDate: dueDate.toLocaleDateString('pt-BR'),
    daysLeft,
    planName: enr.plan?.name ?? null,
    paymentMethod: charge.payment_method,
  }, { relatedId: chargeId })

  revalidatePath('/financial')
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
  const when = start.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const time = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
