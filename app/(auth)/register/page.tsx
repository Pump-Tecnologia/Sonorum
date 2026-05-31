import type { Metadata } from 'next'

import { RegisterForm } from '@/components/auth/RegisterForm'
import styles from '@/components/auth/auth.module.css'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegisterPage() {
  return (
    <>
      <h1 className={styles.title}>Criar conta grátis</h1>
      <p className={styles.subtitle}>
        Crie sua conta no plano Essencial e comece hoje, sem cartão.
      </p>
      <p className={styles.notice}>
        Plano Essencial · grátis · até 5 alunos · 1 professor. Faça upgrade quando quiser.
      </p>
      <RegisterForm />
    </>
  )
}
