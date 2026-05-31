// Constantes da transcrição de áudio por IA (geração de cifra/acordes).

export const TRANSCRIPTION_STATUSES = [
  'processing',
  'pending_review',
  'approved',
  'rejected',
  'failed',
] as const

export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUSES)[number]

export const STATUS_LABEL: Record<TranscriptionStatus, string> = {
  processing: 'Transcrevendo…',
  pending_review: 'Aguardando revisão',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  failed: 'Falhou',
}

export const STATUS_TONE: Record<TranscriptionStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  processing: 'neutral',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'neutral',
  failed: 'danger',
}

// Áudio aceito para transcrição. Limite alto o suficiente p/ uma música, baixo
// o bastante p/ não estourar custo/tempo do provedor.
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024 // 25MB
export const AUDIO_EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
}
export const AUDIO_ACCEPT = Object.keys(AUDIO_EXT_BY_MIME).join(',')
