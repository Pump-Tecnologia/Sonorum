import { brDayBounds, dateInBR } from '@/lib/timezone'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number | null | undefined): string {
  return BRL.format(value ?? 0)
}

export function monthRange(ref = new Date()): { start: string; end: string } {
  const [year, month] = dateInBR(ref).split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    start: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`,
    end: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function dayRange(ref = new Date()): { start: string; end: string } {
  const bounds = brDayBounds(ref)
  return { start: bounds.startISO, end: bounds.endISO }
}
