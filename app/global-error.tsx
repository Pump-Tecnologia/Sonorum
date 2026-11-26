'use client'

import { Figtree } from 'next/font/google'
import { useEffect } from 'react'

import { Button } from '@/components/ds/Button'
import { StatusScreen } from '@/components/app/StatusScreen'
import { errorDigest } from '@/lib/error-digest'

import './globals.css'

const figtree = Figtree({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })

// Falha no layout raiz: substitui o documento inteiro, por isso traz html, body e estilos.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const digest = errorDigest(error)

  return (
    <html lang="pt-BR" className={figtree.variable}>
      <body>
        <title>Erro | Sonorum</title>
        <StatusScreen
          fullPage
          code="Erro"
          title="O Sonorum não carregou"
          message="Tente de novo em alguns segundos."
          digest={digest}
          actions={<Button onClick={() => retry()}>Tentar de novo</Button>}
        />
      </body>
    </html>
  )
}
