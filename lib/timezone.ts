// Fuso horário das aulas — fixo em America/Sao_Paulo (BRT, UTC-3).
// O Brasil não usa mais DST desde 2019, então offset constante.
// Se um dia o app rodar em outros fusos, isso vira config por escola.

const BR_OFFSET = '-03:00'

export function dateInBR(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Hora do dia em Brasília, no formato HH:mm.
export function timeInBR(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')}`
}

export function brMonthBounds(year: number, month: number): { startISO: string; endISO: string } | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  const start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01T00:00:00`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const end = `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`
  return {
    startISO: new Date(`${start}${BR_OFFSET}`).toISOString(),
    endISO: new Date(`${end}${BR_OFFSET}`).toISOString(),
  }
}

export function isValidCalendarDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// Soma dias a uma data no formato YYYY-MM-DD usando UTC para evitar desvios de fuso.
export function addDaysToBRDate(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dt = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dt}`
}

// Diferença em dias inteiros entre duas datas YYYY-MM-DD (toYmd - fromYmd).
export function diffInBRDays(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split('-').map(Number)
  const [y2, m2, d2] = toYmd.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000))
}

export function brDayBounds(date: Date = new Date()): { startISO: string; endISO: string } {
  const today = dateInBR(date)
  const [year, month, day] = today.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  const nextDate = `${String(next.getUTCFullYear()).padStart(4, '0')}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
  const startISO = new Date(`${today}T00:00:00${BR_OFFSET}`).toISOString()
  const nextStart = new Date(`${nextDate}T00:00:00${BR_OFFSET}`).getTime()
  return { startISO, endISO: new Date(nextStart - 1).toISOString() }
}

// `<input type="datetime-local">` produz strings tipo "2026-06-02T14:00"
// SEM informação de fuso. Se a gente gravar isso direto num timestamptz, o
// Postgres interpreta como UTC e a aula "das 14:00" passa a viver "às 14:00
// UTC = 11:00 BRT". Esta função anexa o offset BRT pro instante ficar correto.
export function localBrToServerISO(local: string): string {
  // Aceita 'YYYY-MM-DDTHH:mm' ou 'YYYY-MM-DDTHH:mm:ss'.
  const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(local)
  const withSeconds = hasSeconds ? local : `${local}:00`
  // Se já tem fuso (Z ou ±hh:mm), respeita.
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(withSeconds)) return withSeconds
  return `${withSeconds}${BR_OFFSET}`
}

// Calcula o início do "amanhã" no fuso BR e devolve como Date (UTC interno).
// Usado pelo cron de lembretes pra não pegar a janela errada de UTC.
export function startOfTomorrowBR(now: Date = new Date()): Date {
  // Pega componentes da data atual em fuso BR.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const dateBR = `${get('year')}-${get('month')}-${get('day')}`
  // 00:00 do "amanhã BR" = isoDate +1d + offset BR. Voltamos ao Date (que é UTC).
  const tomorrowBR = new Date(`${dateBR}T00:00:00${BR_OFFSET}`)
  tomorrowBR.setUTCDate(tomorrowBR.getUTCDate() + 1)
  return tomorrowBR
}

export function startOfTodayBR(now: Date = new Date()): Date {
  const tomorrow = startOfTomorrowBR(now)
  return new Date(tomorrow.getTime() - 24 * 60 * 60 * 1000)
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora de Brasília (o servidor roda em UTC). */
export function greetingInBR(date: Date = new Date()): string {
  const hour = Number(timeInBR(date).slice(0, 2))
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** "sábado, 21 de novembro" em Brasília. */
export function longDateInBR(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })
}

/** "09:00" em Brasília, a partir de um ISO do banco. */
export function hourInBR(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
}
