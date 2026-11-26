import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'

import './globals.css'

const figtree = Figtree({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Sonorum — Gestão para escolas de música',
    template: '%s | Sonorum',
  },
  description:
    'Plataforma de gestão para escolas de música: agenda, alunos, professores, materiais e financeiro num só lugar.',
  // Área autenticada não deve ser indexada — o SEO vive em sonorum.com.br
  // (site de marketing, app separado). Crawl liberado para o Google ver o
  // noindex e desindexar; por isso NÃO bloqueamos via robots.txt.
  robots: { index: false, follow: false },
  // O Next gera os <link rel="icon"> automaticamente a partir de
  // app/icon.png e app/apple-icon.png (convenção file-based).
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // suppressHydrationWarning no <body>: extensões de navegador (ColorZilla,
  // Grammarly, etc.) injetam atributos antes do React hidratar. Aplica só ao
  // elemento marcado — mismatches reais dentro da árvore continuam sendo reportados.
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full`}>
      <body className="min-h-full" suppressHydrationWarning>{children}</body>
    </html>
  )
}
