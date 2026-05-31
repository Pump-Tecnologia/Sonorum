import type { SubmitOutcome, TranscriptionProvider, TranscriptionResult } from '@/lib/transcription/types'

// Provedor de transcrição FALSO. Gera uma progressão plausível sem chamar
// serviço externo — permite exercitar o fluxo inteiro (upload → revisão →
// aprovação) e validar o produto com um professor antes de assinar uma API paga.
//
// Determinístico a partir do tamanho da URL para não depender de Math.random().
const PROGRESSIONS: string[][] = [
  ['C', 'G', 'Am', 'F'],
  ['G', 'D', 'Em', 'C'],
  ['Am', 'F', 'C', 'G'],
  ['D', 'A', 'Bm', 'G'],
  ['E', 'B', 'C#m', 'A'],
]

function buildResult(seed: number): TranscriptionResult {
  const progression = PROGRESSIONS[seed % PROGRESSIONS.length]
  const bars = 8
  const secondsPerBar = 2
  const chords = Array.from({ length: bars }, (_, i) => ({
    time: i * secondsPerBar,
    chord: progression[i % progression.length],
  }))
  return { chords, raw: { provider: 'mock', seed } }
}

export const mockProvider: TranscriptionProvider = {
  name: 'mock',
  async submit(audioUrl): Promise<SubmitOutcome> {
    return { status: 'completed', result: buildResult(audioUrl.length) }
  },
  async fetchResult(externalId): Promise<TranscriptionResult> {
    return buildResult(externalId.length)
  },
}
