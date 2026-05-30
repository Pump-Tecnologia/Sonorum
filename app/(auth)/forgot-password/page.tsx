import type { Metadata } from 'next'

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Recuperar senha</h1>
      <p className="mt-1 mb-8 text-sm text-ink-muted">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>
      <ForgotPasswordForm />
    </div>
  )
}
