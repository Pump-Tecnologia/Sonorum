// Cor de cada instrumento no app (agenda, avatares). As cores ficam nos tokens
// --sn-tone-* de app/globals.css; aqui só se decide qual tom usar.
export type InstrumentTone = 'piano' | 'violao' | 'cordas' | 'canto' | 'bateria' | 'outro'

export function instrumentTone(instrument: unknown): InstrumentTone {
  const value = String(Array.isArray(instrument) ? instrument[0] : instrument ?? '').toLowerCase()
  if (/piano|teclado/.test(value)) return 'piano'
  if (/violão|guitarra/.test(value)) return 'violao'
  if (/violino|cordas/.test(value)) return 'cordas'
  if (/canto|voz/.test(value)) return 'canto'
  if (/bateria|percussão/.test(value)) return 'bateria'
  return 'outro'
}
