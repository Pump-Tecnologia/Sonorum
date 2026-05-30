import type { Metadata } from 'next'

import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Criar conta grátis</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Crie sua conta no plano Essencial e comece hoje, sem cartão.
      </p>
      <div className="mt-4 mb-8 rounded-xl bg-accent-100 px-4 py-3 text-xs font-medium text-accent-800">
        Plano Essencial · grátis · até 5 alunos · 1 professor. Faça upgrade quando quiser.
      </div>
      <RegisterForm />
    </div>
  )
}
