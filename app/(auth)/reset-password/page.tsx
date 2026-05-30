import type { Metadata } from 'next'

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Nova senha' }

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Definir nova senha</h1>
      <p className="mt-1 mb-8 text-sm text-ink-muted">Escolha uma senha forte para sua conta.</p>
      <ResetPasswordForm />
    </div>
  )
}
