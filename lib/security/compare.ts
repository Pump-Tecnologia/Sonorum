import { timingSafeEqual } from 'node:crypto'

// Comparação de segredos em tempo constante — evita timing attacks em
// comparações de tokens/segredos de webhook e cron. `timingSafeEqual` exige
// buffers do mesmo tamanho, então o early-return por tamanho é inevitável
// (vazar o TAMANHO do segredo é aceitável; o conteúdo, não).
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
