import type { NotificationEvent, NotificationPayload } from '@/lib/notifications/types'

// Catálogo dos templates aprovados na Meta (Cloud API). Mensagem proativa fora
// da janela de 24h EXIGE template (HSM). Cada item mapeia um evento → nome do
// template + idioma + variáveis do corpo (na ORDEM em que aparecem no texto
// aprovado: {{1}}, {{2}}, ...).
//
// IMPORTANTE: os `name` aqui precisam bater exatamente com os templates criados
// e aprovados no WhatsApp Manager. Ao criar lá, use estas variáveis na ordem.

export interface WhatsAppTemplate {
  name: string
  language: string // ex.: 'pt_BR'
  // Valores das variáveis {{1..n}} do corpo, na ordem.
  variables: (p: NotificationPayload) => string[]
}

const str = (x: unknown, fallback = ''): string => (x === null || x === undefined ? fallback : String(x))
const money = (x: unknown): string => `R$ ${Number(x ?? 0).toFixed(2).replace('.', ',')}`
const who = (p: NotificationPayload) => str(p.recipientName ?? p.studentName, 'aluno(a)')

// Só os eventos que terão template aprovado. Eventos ausentes caem no wa.me
// manual (clique humano) — degradação graciosa.
export const WHATSAPP_TEMPLATES: Partial<Record<NotificationEvent, WhatsAppTemplate>> = {
  'charge.created': {
    name: 'cobranca_nova',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} escola · {{3}} valor · {{4}} vencimento · {{5}} link PIX
    variables: (p) => [who(p), str(p.schoolName, 'sua escola'), money(p.amount), str(p.dueDate), str(p.payUrl)],
  },
  'charge.due_soon': {
    name: 'cobranca_lembrete',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} dias · {{3}} valor · {{4}} vencimento · {{5}} link PIX
    variables: (p) => [who(p), str(p.daysLeft), money(p.amount), str(p.dueDate), str(p.payUrl)],
  },
  'charge.overdue': {
    name: 'cobranca_vencida',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} escola · {{3}} valor · {{4}} vencimento · {{5}} link PIX
    variables: (p) => [who(p), str(p.schoolName, 'sua escola'), money(p.amount), str(p.dueDate), str(p.payUrl)],
  },
  'charge.paid': {
    name: 'pagamento_confirmado',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} valor · {{3}} escola
    variables: (p) => [who(p), money(p.amount), str(p.schoolName, 'sua escola')],
  },
  'lesson.scheduled': {
    name: 'aula_agendada',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} título · {{3}} quando
    variables: (p) => [who(p), str(p.title, 'Aula'), str(p.when)],
  },
  'lesson.tomorrow': {
    name: 'aula_amanha',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} horário
    variables: (p) => [who(p), str(p.time)],
  },
  'lesson.canceled': {
    name: 'aula_cancelada',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} quando
    variables: (p) => [who(p), str(p.when)],
  },
  'lesson.rescheduled': {
    name: 'aula_remarcada',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} de · {{3}} para
    variables: (p) => [who(p), str(p.oldWhen), str(p.when)],
  },
  'lesson.report': {
    name: 'relatorio_aula',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} data · {{3}} música · {{4}} bpm · {{5}} link do relatório
    variables: (p) => [who(p), str(p.lessonDate), str(p.currentSong, '—'), str(p.bpm, '—'), str(p.reportUrl)],
  },
  'progress.monthly_report': {
    name: 'relatorio_mensal',
    language: 'pt_BR',
    // {{1}} aluno · {{2}} mês · {{3}} aulas · {{4}} frequência
    variables: (p) => [who(p), str(p.monthLabel), str(p.lessonsDone), `${str(p.attendanceRate)}%`],
  },
}
