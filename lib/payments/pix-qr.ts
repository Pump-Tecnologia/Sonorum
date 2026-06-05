import 'server-only'

import QRCode from 'qrcode'

// Gera o QR Code do "copia e cola" PIX como SVG (string), pra inline no
// servidor — sem JS no cliente. Nível de correção M (bom p/ telas e impressão).
export async function pixQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
  })
}
