'use client'

import { useEffect } from 'react'

import { Button, LinkButton } from '@/components/ds/Button'
import { StatusScreen } from '@/components/app/StatusScreen'
import { errorDigest } from '@/lib/error-digest'

// Erro inesperado numa tela da área logada: o menu lateral continua disponível.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      code="Erro"
      title="Algo deu errado nesta tela"
      message="Tente de novo. Se continuar, fale com o suporte."
      digest={errorDigest(error)}
      actions={
        <>
          <Button onClick={() => retry()}>Tentar de novo</Button>
          <LinkButton href="/dashboard" variant="soft">Voltar ao início</LinkButton>
        </>
      }
    />
  )
}
