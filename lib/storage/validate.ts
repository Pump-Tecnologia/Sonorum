// Validação de upload no SERVIDOR por magic bytes (item M2 da auditoria).
// `file.type` vem do navegador e é falsificável; o conteúdo, não. Cada upload
// lê os primeiros bytes e confirma que o arquivo É o que diz ser.

const HEAD_BYTES = 16

function ascii(b: Uint8Array, start: number, text: string): boolean {
  if (b.length < start + text.length) return false
  for (let i = 0; i < text.length; i++) {
    if (b[start + i] !== text.charCodeAt(i)) return false
  }
  return true
}

type Sniffer = (b: Uint8Array) => boolean

// Assinaturas dos formatos aceitos pela app, por MIME canônico.
const SNIFFERS: Record<string, Sniffer> = {
  'application/pdf': (b) => ascii(b, 0, '%PDF'),
  'image/png': (b) => b[0] === 0x89 && ascii(b, 1, 'PNG'),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP'),
  // SVG é XML texto — sem assinatura binária; aceita BOM/espaços iniciais.
  'image/svg+xml': (b) => {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(b).trimStart()
    return text.startsWith('<svg') || text.startsWith('<?xml')
  },
  'audio/mpeg': (b) => ascii(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  'audio/wav': (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WAVE'),
  'audio/mp4': (b) => ascii(b, 4, 'ftyp'),
  'audio/aac': (b) => ascii(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xf6) === 0xf0),
  'audio/ogg': (b) => ascii(b, 0, 'OggS'),
}

// MIMEs alternativos que os navegadores reportam → MIME canônico do sniffer.
const MIME_ALIASES: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/x-m4a': 'audio/mp4',
}

export function canonicalMime(mime: string): string {
  return MIME_ALIASES[mime] ?? mime
}

// Confere se o conteúdo do arquivo bate com o MIME declarado pelo navegador.
// Use DEPOIS de validar que o MIME declarado está na lista de aceitos.
export async function matchesDeclaredMime(file: File): Promise<boolean> {
  const sniffer = SNIFFERS[canonicalMime(file.type)]
  if (!sniffer) return false
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())
  return sniffer(head)
}
