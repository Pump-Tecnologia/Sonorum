import type {
  ChordEvent,
  SubmitOutcome,
  TranscriptionProvider,
  TranscriptionResult,
} from '@/lib/transcription/types'

// Adaptador para um provedor real de reconhecimento de acordes (ex.: Klangio /
// klang.io, que expõe chord-recognition via REST). É ASSÍNCRONO: submit()
// devolve um id de job e o resultado chega depois (webhook/poll → fetchResult).
//
// ATENÇÃO: confirme os endpoints e o formato exato da resposta na documentação
// do provedor escolhido antes de produção. As funções de normalização abaixo
// isolam esse formato — só elas mudam se a API for diferente.

const API_URL = process.env.KLANGIO_API_URL ?? 'https://api.klang.io'
const API_KEY = process.env.KLANGIO_API_KEY

function authHeaders(): HeadersInit {
  if (!API_KEY) throw new Error('KLANGIO_API_KEY não configurada.')
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

// Normaliza a resposta do provedor para o nosso ChordEvent[]. Tolerante a
// nomes de campo comuns (time/start/timestamp; chord/label/name).
function normalizeChords(raw: unknown): ChordEvent[] {
  const arr = extractArray(raw)
  const events: ChordEvent[] = []
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const time = pickNumber(o.time ?? o.start ?? o.timestamp ?? o.start_time)
    const chord = pickString(o.chord ?? o.label ?? o.name)
    if (chord !== null) events.push({ time: time ?? 0, chord })
  }
  return events
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.chords)) return o.chords
    if (Array.isArray(o.result)) return o.result
  }
  return []
}

function pickNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

async function parseJson(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`Provedor de transcrição respondeu ${res.status}.`)
  return res.json()
}

export const klangioProvider: TranscriptionProvider = {
  name: 'klangio',

  async submit(audioUrl, opts): Promise<SubmitOutcome> {
    const res = await fetch(`${API_URL}/transcription`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        audio_url: audioUrl,
        model: 'chords',
        instrument: opts.instrument ?? undefined,
      }),
    })
    const data = (await parseJson(res)) as Record<string, unknown>
    const externalId = pickString(data.job_id ?? data.id)
    if (!externalId) throw new Error('Provedor não retornou um id de job.')
    return { status: 'pending', externalId }
  },

  async fetchResult(externalId): Promise<TranscriptionResult> {
    const res = await fetch(`${API_URL}/transcription/${externalId}`, {
      headers: authHeaders(),
    })
    const data = await parseJson(res)
    return { chords: normalizeChords(data), raw: data }
  },
}
