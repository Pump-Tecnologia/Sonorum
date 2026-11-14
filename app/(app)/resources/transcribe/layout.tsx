import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { TRANSCRIPTION_ENABLED } from '@/lib/constants/transcription'

// Com a transcrição desligada, todas as rotas /resources/transcribe dão 404.
export default function TranscribeLayout({ children }: { children: ReactNode }) {
  if (!TRANSCRIPTION_ENABLED) notFound()
  return children
}
