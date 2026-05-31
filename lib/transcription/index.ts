import { klangioProvider } from '@/lib/transcription/klangio'
import { mockProvider } from '@/lib/transcription/mock'
import type { TranscriptionProvider } from '@/lib/transcription/types'

// Seleciona o provedor por env. Default = mock, para o fluxo funcionar de ponta
// a ponta sem dependência externa (validação de produto). Em produção, defina
// TRANSCRIPTION_PROVIDER=klangio + KLANGIO_API_KEY.
export function getTranscriptionProvider(): TranscriptionProvider {
  const name = process.env.TRANSCRIPTION_PROVIDER ?? 'mock'
  switch (name) {
    case 'klangio':
      return klangioProvider
    case 'mock':
      return mockProvider
    default:
      throw new Error(`Provedor de transcrição desconhecido: ${name}`)
  }
}

export type { TranscriptionProvider, TranscriptionResult } from '@/lib/transcription/types'
