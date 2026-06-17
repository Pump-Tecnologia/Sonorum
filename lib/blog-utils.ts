/**
 * Utilitários puros do blog — sem dependências de Node.js.
 * Pode ser importado em Client Components.
 */

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
