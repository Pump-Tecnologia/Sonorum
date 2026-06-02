// Fuso horário das aulas — fixo em America/Sao_Paulo (BRT, UTC-3).
// O Brasil não usa mais DST desde 2019, então offset constante.
// Se um dia o app rodar em outros fusos, isso vira config por escola.

const BR_OFFSET = '-03:00'

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
