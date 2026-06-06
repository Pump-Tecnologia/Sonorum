import 'server-only'

// Cifra/decifra o refresh token do Google (AES-256-GCM, Web Crypto).
// Chave de 32 bytes em base64 na env CALENDAR_ENC_KEY. Só é usado quando o
// usuário conecta de fato (fluxo OAuth), então a ausência da chave só importa aí.

function getKeyMaterial(): ArrayBuffer {
  const b64 = process.env.CALENDAR_ENC_KEY
  if (!b64) throw new Error('CALENDAR_ENC_KEY ausente — necessária para cifrar tokens do Google.')
  const raw = Buffer.from(b64, 'base64')
  if (raw.length !== 32) throw new Error('CALENDAR_ENC_KEY deve ter 32 bytes (base64).')
  const u8 = new Uint8Array(32)
  u8.set(raw)
  return u8.buffer
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', getKeyMaterial(), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

// Formato armazenado: base64(iv).base64(ciphertext)
export async function encryptToken(plain: string): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plain)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return `${Buffer.from(iv).toString('base64')}.${Buffer.from(new Uint8Array(ct)).toString('base64')}`
}

export async function decryptToken(stored: string): Promise<string> {
  const [ivB64, ctB64] = stored.split('.')
  if (!ivB64 || !ctB64) throw new Error('Token cifrado inválido.')
  const key = await importKey()
  const iv = Uint8Array.from(Buffer.from(ivB64, 'base64'))
  const ct = Uint8Array.from(Buffer.from(ctB64, 'base64'))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}
