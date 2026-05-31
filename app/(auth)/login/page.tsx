import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/LoginForm'
import styles from '@/components/auth/auth.module.css'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <>
      <h1 className={styles.title}>Entrar</h1>
      <p className={styles.subtitle}>Acesse o painel da sua escola.</p>
      <LoginForm next={next} />
    </>
  )
}
