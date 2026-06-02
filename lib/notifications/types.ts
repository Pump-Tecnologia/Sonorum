// Catálogo de eventos de notificação. Adicionar aqui ANTES de chamar notify().
export const NOTIFICATION_EVENTS = [
  'charge.created',
  'charge.due_soon',
  'charge.overdue',
  'charge.paid',
  'lesson.scheduled',
  'lesson.tomorrow',
  'lesson.canceled',
  'lesson.rescheduled',
  'progress.monthly_report',
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export type NotificationChannel = 'email' | 'whatsapp'

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'skipped'

// Para quem mandar (configurável por aluno).
export type NotifyTo = 'student' | 'parent' | 'both'

export const NOTIFY_TO_LABEL: Record<NotifyTo, string> = {
  student: 'Aluno',
  parent: 'Responsável',
  both: 'Aluno e responsável',
}

// Contexto que o template renderiza. Variáveis livres por evento.
export type NotificationPayload = Record<string, string | number | null | undefined>
