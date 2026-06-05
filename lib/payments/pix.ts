// Gerador de "PIX copia e cola" (BR Code / EMV-MPM estático com valor).
// Custo ZERO: usa a chave PIX da própria escola; nenhum gateway envolvido.
// Spec: EMV QRCPS-MPM + Manual do BR Code do Banco Central.

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

export interface PixPayloadInput {
  key: string // chave PIX do recebedor (escola)
  merchantName: string // nome do recebedor (máx 25, sem acento)
  merchantCity: string // cidade do recebedor (máx 15, sem acento)
  amount?: number | null // valor em BRL; omitido = pagador digita
  txid?: string | null // identificador (máx 25 alfanumérico); default "***"
}

// Campo TLV: id (2) + tamanho (2, zero-padded) + valor.
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

// Remove acentos e caracteres não-ASCII; o BR Code exige texto simples.
function sanitizeText(input: string, maxLen: number): string {
  const ascii = input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove diacríticos combinantes
    .replace(/[^\x20-\x7E]/g, '') // mantém só ASCII imprimível
    .trim()
  return ascii.slice(0, maxLen)
}

// txid: só alfanumérico, máx 25. Vazio → "***" (válido no BR Code).
function sanitizeTxid(input?: string | null): string {
  const clean = (input ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)
  return clean.length > 0 ? clean : '***'
}

// CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF), em hex maiúsculo de 4 dígitos.
// É exatamente o CRC exigido pelo BR Code (campo 63).
export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Monta o "copia e cola" completo (com CRC).
export function buildPixPayload(input: PixPayloadInput): string {
  const merchantName = sanitizeText(input.merchantName || 'RECEBEDOR', 25)
  const merchantCity = sanitizeText(input.merchantCity || 'BRASIL', 15)
  const txid = sanitizeTxid(input.txid)

  // Merchant Account Information (26): GUI + chave PIX.
  const mai = tlv('00', 'br.gov.bcb.pix') + tlv('01', input.key.trim())

  const fields: string[] = [
    tlv('00', '01'), // Payload Format Indicator
    tlv('26', mai), // Merchant Account Information — PIX
    tlv('52', '0000'), // Merchant Category Code
    tlv('53', '986'), // Moeda: BRL
  ]

  if (input.amount != null && input.amount > 0) {
    fields.push(tlv('54', input.amount.toFixed(2))) // valor (ponto decimal, 2 casas)
  }

  fields.push(
    tlv('58', 'BR'), // País
    tlv('59', merchantName), // Nome do recebedor
    tlv('60', merchantCity), // Cidade do recebedor
    tlv('62', tlv('05', txid)), // Additional Data Field — txid
  )

  // CRC é calculado sobre tudo + "6304" (id+len do próprio CRC).
  const partial = `${fields.join('')}6304`
  return `${partial}${crc16(partial)}`
}

// ── Validação leve da chave PIX por tipo (usada no formulário) ───────────────
export function pixKeyTypeLabel(type: PixKeyType): string {
  const map: Record<PixKeyType, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'E-mail',
    phone: 'Celular',
    random: 'Chave aleatória',
  }
  return map[type]
}
