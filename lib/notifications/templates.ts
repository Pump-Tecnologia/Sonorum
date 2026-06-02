import type { NotificationEvent, NotificationPayload } from '@/lib/notifications/types'

interface Template {
  // Email
  subject: (p: NotificationPayload) => string
  email: (p: NotificationPayload) => { html: string; text: string }
  // WhatsApp (texto plano com emojis; cabe no link wa.me)
  whatsapp: (p: NotificationPayload) => string
}

// Helpers leves.
const v = (x: unknown, fallback = ''): string => (x === null || x === undefined ? fallback : String(x))
const money = (x: unknown): string => `R$ ${Number(x ?? 0).toFixed(2).replace('.', ',')}`
const greeting = (p: NotificationPayload) => `Olá, ${v(p.recipientName ?? p.studentName, 'tudo bem?')}`
const sig = (p: NotificationPayload) => `${v(p.schoolName, 'Sua escola')}\n(esta mensagem foi enviada pelo Sonorum)`

// Wrapper HTML mínimo (logo da escola entra se Premium → branding nativo).
function htmlWrap(p: NotificationPayload, inner: string): string {
  const brand = v(p.brandPrimary, '#2B4C79')
  const logo = v(p.logoUrl)
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6fa;font-family:system-ui,sans-serif;color:#1F3A5F">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 24px -10px rgba(31,58,95,.1)">
      ${logo ? `<img src="${logo}" alt="" style="height:40px;margin-bottom:16px">` : ''}
      <div style="font-size:14px;line-height:1.6;color:#1F3A5F">${inner}</div>
      <hr style="border:none;border-top:1px solid #E4E8EF;margin:24px 0">
      <div style="font-size:12px;color:#6B7480">${v(p.schoolName, 'Sua escola')} · enviado pelo <span style="color:${brand};font-weight:600">Sonorum</span></div>
    </div>
  </div></body></html>`
}

export const TEMPLATES: Record<NotificationEvent, Template> = {
  'charge.created': {
    subject: (p) => `Nova mensalidade ${money(p.amount)} · vence ${v(p.dueDate)}`,
    email: (p) => {
      const text = `${greeting(p)}\n\nUma nova mensalidade foi gerada:\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}\n• Plano: ${v(p.planName)}\n\n${sig(p)}`
      const html = htmlWrap(p, `<p>${greeting(p)}</p><p>Uma nova mensalidade foi gerada na <strong>${v(p.schoolName)}</strong>:</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li>${p.planName ? `<li>Plano: ${v(p.planName)}</li>` : ''}</ul>`)
      return { html, text }
    },
    whatsapp: (p) => `${greeting(p)}\n\n*Nova mensalidade* da ${v(p.schoolName)}:\n💰 Valor: ${money(p.amount)}\n📅 Vencimento: ${v(p.dueDate)}\n\n${sig(p)}`,
  },

  'charge.due_soon': {
    subject: (p) => `Lembrete: mensalidade ${money(p.amount)} vence em ${v(p.daysLeft)} dia(s)`,
    email: (p) => {
      const text = `${greeting(p)}\n\nSua mensalidade vence em ${v(p.daysLeft)} dia(s):\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}\n\n${sig(p)}`
      return { text, html: htmlWrap(p, `<p>${greeting(p)}</p><p>Lembrete amigável: sua mensalidade vence em <strong>${v(p.daysLeft)} dia(s)</strong>.</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li></ul>`) }
    },
    whatsapp: (p) => `${greeting(p)} 👋\n\nLembrete: sua mensalidade na ${v(p.schoolName)} vence em *${v(p.daysLeft)} dia(s)*.\n💰 ${money(p.amount)}\n📅 ${v(p.dueDate)}`,
  },

  'charge.overdue': {
    subject: (p) => `Mensalidade vencida · ${money(p.amount)}`,
    email: (p) => {
      const text = `${greeting(p)}\n\nIdentificamos que a mensalidade abaixo está vencida:\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}\n\nPor favor entre em contato com a ${v(p.schoolName)} para regularizar.\n\n${sig(p)}`
      return { text, html: htmlWrap(p, `<p>${greeting(p)}</p><p>Identificamos que a mensalidade abaixo está <strong style="color:#DC2626">vencida</strong>:</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li></ul><p>Por favor entre em contato com a ${v(p.schoolName)} para regularizar.</p>`) }
    },
    whatsapp: (p) => `${greeting(p)}\n\n⚠️ Sua mensalidade na ${v(p.schoolName)} está *vencida*:\n💰 ${money(p.amount)} · 📅 ${v(p.dueDate)}\n\nEntre em contato pra regularizar.`,
  },

  'charge.paid': {
    subject: (p) => `Pagamento confirmado · ${money(p.amount)}`,
    email: (p) => {
      const text = `${greeting(p)}\n\nRecebemos o pagamento da mensalidade de ${money(p.amount)}. Obrigado!\n\n${sig(p)}`
      return { text, html: htmlWrap(p, `<p>${greeting(p)}</p><p>✅ Recebemos seu pagamento de <strong>${money(p.amount)}</strong>. Obrigado!</p>${p.paymentMethod ? `<p style="color:#6B7480">Método: ${v(p.paymentMethod)}</p>` : ''}`) }
    },
    whatsapp: (p) => `${greeting(p)}\n\n✅ Pagamento de *${money(p.amount)}* recebido. Obrigado! — ${v(p.schoolName)}`,
  },

  'lesson.scheduled': {
    subject: (p) => `Nova aula agendada · ${v(p.when)}`,
    email: (p) => ({
      text: `${greeting(p)}\n\nUma nova aula foi agendada:\n• ${v(p.title, 'Aula')}\n• Quando: ${v(p.when)}\n${p.room ? `• Sala: ${v(p.room)}\n` : ''}${p.teacherName ? `• Professor: ${v(p.teacherName)}\n` : ''}\n${sig(p)}`,
      html: htmlWrap(p, `<p>${greeting(p)}</p><p>Uma nova aula foi agendada:</p><ul><li><strong>${v(p.title, 'Aula')}</strong></li><li>Quando: <strong>${v(p.when)}</strong></li>${p.room ? `<li>Sala: ${v(p.room)}</li>` : ''}${p.teacherName ? `<li>Professor: ${v(p.teacherName)}</li>` : ''}</ul>`),
    }),
    whatsapp: (p) => `${greeting(p)}\n\n📅 Nova aula agendada na ${v(p.schoolName)}:\n• ${v(p.title, 'Aula')}\n• ${v(p.when)}${p.room ? `\n• Sala: ${v(p.room)}` : ''}`,
  },

  'lesson.tomorrow': {
    subject: (p) => `Lembrete: aula amanhã às ${v(p.time)}`,
    email: (p) => ({
      text: `${greeting(p)}\n\nLembrete da aula de amanhã:\n• ${v(p.title, 'Aula')}\n• Horário: ${v(p.time)}\n${p.room ? `• Sala: ${v(p.room)}\n` : ''}${p.teacherName ? `• Professor: ${v(p.teacherName)}\n` : ''}\n${sig(p)}`,
      html: htmlWrap(p, `<p>${greeting(p)}</p><p>Lembrete da aula de amanhã:</p><ul><li><strong>${v(p.title, 'Aula')}</strong></li><li>Horário: <strong>${v(p.time)}</strong></li>${p.room ? `<li>Sala: ${v(p.room)}</li>` : ''}${p.teacherName ? `<li>Professor: ${v(p.teacherName)}</li>` : ''}</ul>`),
    }),
    whatsapp: (p) => `${greeting(p)} 👋\n\n🎵 Lembrete: você tem aula *amanhã* às ${v(p.time)}${p.room ? ` na ${v(p.room)}` : ''}.\nTe vejo lá!`,
  },

  'lesson.canceled': {
    subject: (p) => `Aula cancelada · ${v(p.when)}`,
    email: (p) => ({
      text: `${greeting(p)}\n\nA aula de ${v(p.when)} foi cancelada.\n${p.reason ? `Motivo: ${v(p.reason)}\n` : ''}\n${sig(p)}`,
      html: htmlWrap(p, `<p>${greeting(p)}</p><p>A aula de <strong>${v(p.when)}</strong> foi <strong style="color:#DC2626">cancelada</strong>.</p>${p.reason ? `<p>Motivo: ${v(p.reason)}</p>` : ''}`),
    }),
    whatsapp: (p) => `${greeting(p)}\n\n❌ Sua aula de ${v(p.when)} foi cancelada.${p.reason ? `\nMotivo: ${v(p.reason)}` : ''}`,
  },

  'lesson.rescheduled': {
    subject: (p) => `Aula remarcada para ${v(p.when)}`,
    email: (p) => ({
      text: `${greeting(p)}\n\nSua aula foi remarcada:\n• De: ${v(p.oldWhen)}\n• Para: ${v(p.when)}\n${p.room ? `• Sala: ${v(p.room)}\n` : ''}\n${sig(p)}`,
      html: htmlWrap(p, `<p>${greeting(p)}</p><p>Sua aula foi <strong>remarcada</strong>:</p><ul><li>De: <s>${v(p.oldWhen)}</s></li><li>Para: <strong>${v(p.when)}</strong></li>${p.room ? `<li>Sala: ${v(p.room)}</li>` : ''}</ul>`),
    }),
    whatsapp: (p) => `${greeting(p)}\n\n🔄 Aula remarcada:\nDe: ${v(p.oldWhen)}\nPara: *${v(p.when)}*${p.room ? `\nSala: ${v(p.room)}` : ''}`,
  },

  'progress.monthly_report': {
    subject: (p) => `Seu progresso em ${v(p.monthLabel)}`,
    email: (p) => ({
      text: `${greeting(p)}\n\nResumo do mês de ${v(p.monthLabel)} na ${v(p.schoolName)}:\n• Aulas: ${v(p.lessonsDone)}\n• Frequência: ${v(p.attendanceRate)}%\n• Metas concluídas: ${v(p.goalsDone)}/${v(p.goalsTotal)}\n\n${sig(p)}`,
      html: htmlWrap(p, `<p>${greeting(p)}</p><h2 style="margin:16px 0 8px;font-size:18px">Resumo de ${v(p.monthLabel)}</h2><ul><li>Aulas: <strong>${v(p.lessonsDone)}</strong></li><li>Frequência: <strong>${v(p.attendanceRate)}%</strong></li><li>Metas concluídas: <strong>${v(p.goalsDone)}/${v(p.goalsTotal)}</strong></li></ul>`),
    }),
    whatsapp: (p) => `${greeting(p)} 🎵\n\nResumo do seu mês na ${v(p.schoolName)}:\n• Aulas: *${v(p.lessonsDone)}*\n• Frequência: *${v(p.attendanceRate)}%*\n• Metas: ${v(p.goalsDone)}/${v(p.goalsTotal)}\n\nContinue assim!`,
  },
}
