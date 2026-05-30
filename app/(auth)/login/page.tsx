import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Entrar</h1>
      <p className="mt-1 mb-8 text-sm text-ink-muted">Acesse o painel da sua escola.</p>
      <LoginForm next={next} />
    </div>
  )
}
