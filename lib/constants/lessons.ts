// Fonte única da verdade dos status de aula (espelha o CHECK em public.lessons).
export type LessonStatus = 'scheduled' | 'completed' | 'late' | 'missed' | 'canceled'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export const LESSON_STATUS: Record<LessonStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Agendada', tone: 'neutral' },
  completed: { label: 'Realizada', tone: 'success' },
  late: { label: 'Atrasado', tone: 'warning' },
  missed: { label: 'Faltou', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'danger' },
}

export function lessonStatus(status: string): { label: string; tone: StatusTone } {
  return LESSON_STATUS[status as LessonStatus] ?? { label: status, tone: 'neutral' }
}
