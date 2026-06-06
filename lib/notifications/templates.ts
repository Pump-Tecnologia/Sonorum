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

// CTA de pagamento PIX — renderizado só quando a cobrança tem link (payUrl).
const payButton = (p: NotificationPayload): string =>
  p.payUrl
    ? `<div style="margin:20px 0"><a href="${v(p.payUrl)}" style="display:inline-block;background:#63C08F;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Pagar com PIX</a></div>`
    : ''
const payLineText = (p: NotificationPayload): string => (p.payUrl ? `\n💳 Pague com PIX: ${v(p.payUrl)}\n` : '')
const payLineWa = (p: NotificationPayload): string => (p.payUrl ? `\n\n💳 *Pague com PIX:*\n${v(p.payUrl)}` : '')

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
    subject: (p) => `Nova cobrança ${money(p.amount)} · vence ${v(p.dueDate)}`,
    email: (p) => {
      const text = `${greeting(p)}\n\nUma nova cobrança foi gerada:\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}${p.planName ? `\n• Referente a: ${v(p.planName)}` : ''}\n${payLineText(p)}\n${sig(p)}`
      const html = htmlWrap(p, `<p>${greeting(p)}</p><p>Uma nova cobrança foi gerada na <strong>${v(p.schoolName)}</strong>:</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li>${p.planName ? `<li>Referente a: ${v(p.planName)}</li>` : ''}</ul>${payButton(p)}`)
      return { html, text }
    },
    whatsapp: (p) => `${greeting(p)}\n\n*Nova cobrança* da ${v(p.schoolName)}:\n💰 Valor: ${money(p.amount)}\n📅 Vencimento: ${v(p.dueDate)}${payLineWa(p)}\n\n${sig(p)}`,
  },

  'charge.due_soon': {
    subject: (p) => `Lembrete: cobrança ${money(p.amount)} vence em ${v(p.daysLeft)} dia(s)`,
    email: (p) => {
      const text = `${greeting(p)}\n\nSua cobrança vence em ${v(p.daysLeft)} dia(s):\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}${payLineText(p)}\n${sig(p)}`
      return { text, html: htmlWrap(p, `<p>${greeting(p)}</p><p>Lembrete amigável: sua cobrança vence em <strong>${v(p.daysLeft)} dia(s)</strong>.</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li></ul>${payButton(p)}`) }
    },
    whatsapp: (p) => `${greeting(p)} 👋\n\nLembrete: sua cobrança na ${v(p.schoolName)} vence em *${v(p.daysLeft)} dia(s)*.\n💰 ${money(p.amount)}\n📅 ${v(p.dueDate)}${payLineWa(p)}`,
  },

  'charge.overdue': {
    subject: (p) => `Cobrança vencida · ${money(p.amount)}`,
    email: (p) => {
      const text = `${greeting(p)}\n\nIdentificamos que a cobrança abaixo está vencida:\n• Valor: ${money(p.amount)}\n• Vencimento: ${v(p.dueDate)}${payLineText(p)}\nSe já pagou, desconsidere. Em caso de dúvida, fale com a ${v(p.schoolName)}.\n\n${sig(p)}`
      return { text, html: htmlWrap(p, `<p>${greeting(p)}</p><p>Identificamos que a cobrança abaixo está <strong style="color:#DC2626">vencida</strong>:</p><ul><li>Valor: <strong>${money(p.amount)}</strong></li><li>Vencimento: <strong>${v(p.dueDate)}</strong></li></ul>${payButton(p)}<p style="color:#6B7480">Se já pagou, desconsidere. Em caso de dúvida, fale com a ${v(p.schoolName)}.</p>`) }
    },
    whatsapp: (p) => `${greeting(p)}\n\n⚠️ Sua cobrança na ${v(p.schoolName)} está *vencida*:\n💰 ${money(p.amount)} · 📅 ${v(p.dueDate)}${payLineWa(p)}`,
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

  'lesson.report': {
    subject: (p) => `Relatório da aula${p.lessonDate ? ` · ${v(p.lessonDate)}` : ''}`,
    email: (p) => {
      const skills = `Técnica ${v(p.technique, '–')}/5 · Teoria ${v(p.theory, '–')}/5 · Repertório ${v(p.repertoire, '–')}/5 · Prática ${v(p.practice, '–')}/5`
      const text = `${greeting(p)}\n\nRelatório da aula${p.lessonTitle ? ` "${v(p.lessonTitle)}"` : ''}${p.lessonDate ? ` de ${v(p.lessonDate)}` : ''}:\n• Avaliação: ${skills}${p.currentSong ? `\n• Música: ${v(p.currentSong)}` : ''}${p.bpm ? `\n• BPM: ${v(p.bpm)}` : ''}${p.notes ? `\n\nObservações: ${v(p.notes)}` : ''}${p.reportUrl ? `\n\n📄 Ver relatório completo: ${v(p.reportUrl)}` : ''}\n\n${sig(p)}`
      const reportBtn = p.reportUrl
        ? `<div style="margin:18px 0"><a href="${v(p.reportUrl)}" style="display:inline-block;background:#2b4c79;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Ver relatório completo</a></div>`
        : ''
      const html = htmlWrap(p, `<p>${greeting(p)}</p><p>Segue o relatório da sua aula${p.lessonTitle ? ` <strong>${v(p.lessonTitle)}</strong>` : ''}${p.lessonDate ? ` de <strong>${v(p.lessonDate)}</strong>` : ''}:</p><ul><li>Técnica: <strong>${v(p.technique, '–')}/5</strong></li><li>Teoria: <strong>${v(p.theory, '–')}/5</strong></li><li>Repertório: <strong>${v(p.repertoire, '–')}/5</strong></li><li>Prática: <strong>${v(p.practice, '–')}/5</strong></li>${p.currentSong ? `<li>Música atual: ${v(p.currentSong)}</li>` : ''}${p.bpm ? `<li>BPM: ${v(p.bpm)}</li>` : ''}</ul>${p.notes ? `<p style="margin-top:12px"><strong>Observações:</strong> ${v(p.notes)}</p>` : ''}${reportBtn}`)
      return { html, text }
    },
    whatsapp: (p) => `${greeting(p)} 🎵\n\n*Relatório da aula*${p.lessonDate ? ` (${v(p.lessonDate)})` : ''}:\n• Técnica ${v(p.technique, '–')}/5 · Teoria ${v(p.theory, '–')}/5\n• Repertório ${v(p.repertoire, '–')}/5 · Prática ${v(p.practice, '–')}/5${p.currentSong ? `\n• Música: ${v(p.currentSong)}` : ''}${p.bpm ? `\n• BPM: ${v(p.bpm)}` : ''}${p.reportUrl ? `\n\n📄 ${v(p.reportUrl)}` : ''}\n\n${sig(p)}`,
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
