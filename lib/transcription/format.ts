import type { ChordEvent, TranscriptionResult } from '@/lib/transcription/types'

function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// Converte o resultado do provedor em uma cifra de texto editável — o ponto de
// partida que o professor revisa. Linha por acorde, com marca de tempo.
// Acordes repetidos em sequência são colapsados (evita "C C C C").
export function chordsToText(result: TranscriptionResult): string {
  const chords = result.chords ?? []
  if (chords.length === 0) return ''

  const lines: string[] = ['# Cifra gerada por IA — revise antes de aprovar', '']
  let prev: string | null = null
  for (const ev of chords) {
    if (ev.chord === prev) continue
    lines.push(`[${mmss(ev.time)}]  ${ev.chord}`)
    prev = ev.chord
  }
  return lines.join('\n')
}

// Sequência compacta de acordes únicos (para preview na lista).
export function chordSummary(chords: ChordEvent[], max = 8): string {
  const unique: string[] = []
  for (const ev of chords) {
    if (unique[unique.length - 1] !== ev.chord) unique.push(ev.chord)
  }
  const head = unique.slice(0, max).join(' · ')
  return unique.length > max ? `${head} …` : head
}
