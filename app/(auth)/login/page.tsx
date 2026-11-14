import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/LoginForm'
import styles from '@/components/auth/auth.module.css'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <>
      <h1 className={styles.title}>Entrar</h1>
      <p className={styles.subtitle}>Acesse o painel da sua escola.</p>
      {error === 'role' && (
        <p role="alert" className={styles.alert}>
          Não foi possível identificar seu perfil de acesso. Entre em contato com o suporte da sua escola.
        </p>
      )}
      <LoginForm next={next} />
    </>
  )
}
