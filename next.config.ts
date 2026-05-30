import path from 'node:path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Fixa a raiz de tracing neste app. Sem isso, o Next sobe a árvore e acha
  // outros package-lock.json (home do usuário), quebrando o output tracing.
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
