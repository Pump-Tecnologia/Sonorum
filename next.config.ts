import path from 'node:path'

import type { NextConfig } from 'next'

// Headers de segurança (itens "Baixos/Higiene" da auditoria).
// CSP de script/style fica para um rollout próprio (report-only primeiro):
// o checkout usa o SDK do Mercado Pago (Bricks) e uma CSP errada quebra
// pagamento em produção. As diretivas abaixo são as que não têm como quebrar.
const SECURITY_HEADERS = [
  // Navegador não tenta adivinhar content-type (bloqueia sniffing de uploads).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // App não roda dentro de iframe de terceiros (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Não vaza URL completa para outras origens.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Força HTTPS por 1 ano (Vercel já redireciona; isto fixa no navegador).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // A app não usa câmera/microfone/geolocalização.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Baseline de CSP que não restringe script/style: bloqueia plugins,
  // <base> malicioso e embedding (reforça o X-Frame-Options).
  { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
]

const nextConfig: NextConfig = {
  // Fixa a raiz de tracing neste app. Sem isso, o Next sobe a árvore e acha
  // outros package-lock.json (home do usuário), quebrando o output tracing.
  outputFileTracingRoot: path.join(__dirname),

  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
