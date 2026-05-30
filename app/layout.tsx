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
    template: '%s · Sonorum',
  },
  description:
    'Plataforma de gestão para escolas de música: agenda, alunos, professores, materiais e financeiro num só lugar.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
