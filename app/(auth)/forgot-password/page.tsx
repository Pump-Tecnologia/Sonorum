import type { Metadata } from 'next'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import styles from '@/components/auth/auth.module.css'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className={styles.title}>Recuperar senha</h1>
      <p className={styles.subtitle}>
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>
      <ForgotPasswordForm />
    </>
  )
}
