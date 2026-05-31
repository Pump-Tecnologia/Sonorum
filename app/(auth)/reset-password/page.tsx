import type { Metadata } from 'next'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import styles from '@/components/auth/auth.module.css'

export const metadata: Metadata = { title: 'Nova senha' }

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className={styles.title}>Definir nova senha</h1>
      <p className={styles.subtitle}>Escolha uma senha forte para sua conta.</p>
      <ResetPasswordForm />
    </>
  )
}
