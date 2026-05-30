const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number | null | undefined): string {
  return BRL.format(value ?? 0)
}

export function monthRange(ref = new Date()): { start: string; end: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export function dayRange(ref = new Date()): { start: string; end: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0)
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}
