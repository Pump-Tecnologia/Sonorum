// Normaliza um número p/ formato E.164 sem '+' (jeito que wa.me aceita).
// '(33) 99700-3499' → '5533997003499' · '+1 415 555 0100' → '14155550100'.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D+/g, '')
  if (!digits) return null
  // Heurística BR: se ficou com 10 ou 11 dígitos e começa com 1-9 (DDD válido),
  // assume Brasil e adiciona o 55.
  if ((digits.length === 10 || digits.length === 11) && /^[1-9]/.test(digits)) {
    digits = '55' + digits
  }
  return digits.length >= 10 ? digits : null
}

// Gera o link wa.me que abre o WhatsApp Web/App com a mensagem pré-preenchida.
export function waLink(phone: string | null | undefined, message: string): string | null {
  const p = normalizePhone(phone)
  if (!p) return null
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`
}
