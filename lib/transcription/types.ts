// Contrato do provedor de transcrição de áudio → acordes (cifra).
// Permite trocar de serviço (mock, Klangio, Music.ai, modelo self-hosted) sem
// tocar nas server actions nem na UI.

export interface ChordEvent {
  /** Início do acorde em segundos a partir do começo do áudio. */
  time: number
  /** Nome do acorde, ex.: "C", "Am", "G7". */
  chord: string
}

export interface TranscriptionResult {
  chords: ChordEvent[]
  /** Resposta crua do provedor, guardada para auditoria/depuração. */
  raw?: unknown
}

// submit() pode resolver de duas formas:
//  - 'completed': provedor síncrono (ou mock) — resultado já disponível.
//  - 'pending':   provedor assíncrono — devolve um id externo; o resultado
//                 chega depois via fetchResult() (acionado por webhook/poll).
export type SubmitOutcome =
  | { status: 'completed'; result: TranscriptionResult }
  | { status: 'pending'; externalId: string }

export interface TranscriptionProvider {
  readonly name: string
  /** Recebe uma URL assinada do áudio e inicia a transcrição. */
  submit(audioUrl: string, opts: { instrument?: string | null }): Promise<SubmitOutcome>
  /** Busca o resultado de um job assíncrono já submetido. */
  fetchResult(externalId: string): Promise<TranscriptionResult>
}
