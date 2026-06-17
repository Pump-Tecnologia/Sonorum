import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Criptografia simétrica para segredos em repouso (ex.: apiKey da subconta Asaas
// de cada escola). AES-256-GCM (autenticado): detecta adulteração no decrypt.
//
// Chave: env SECRETS_ENC_KEY = 32 bytes em hex (64 chars) ou base64.
// Gere com: openssl rand -hex 32
//
// Formato persistido (string única): `v1.<iv>.<authTag>.<ciphertext>` (cada
// parte em base64). O prefixo de versão permite girar algoritmo/chave no futuro.

const VERSION = 'v1'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // recomendado para GCM

function loadKey(): Buffer {
  const raw = process.env.SECRETS_ENC_KEY
  if (!raw) {
    throw new Error('SECRETS_ENC_KEY não configurada (32 bytes em hex/base64).')
  }
  const key = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('SECRETS_ENC_KEY inválida: precisa decodificar para 32 bytes (AES-256).')
  }
  return key
}

// Cifra um texto. Retorna a string versionada pronta para gravar no banco.
export function encryptSecret(plaintext: string): string {
  const key = loadKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

// Decifra uma string gerada por encryptSecret. Lança se o formato/versão for
// desconhecido ou se a autenticação (authTag) falhar.
export function decryptSecret(payload: string): string {
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Segredo cifrado em formato inválido ou versão não suportada.')
  }
  const key = loadKey()
  const iv = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  const ct = Buffer.from(parts[3], 'base64')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

// True se a string parece um segredo cifrado por este módulo (não valida a chave).
export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${VERSION}.`) && value.split('.').length === 4
}
