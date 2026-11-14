import Link from 'next/link'

import { Card } from '@/components/ui/Card'

// Resultado compartilhado após criar professor/aluno: confirma envio do link seguro.
export function CreatePersonResult({
  email,
  backHref,
  backLabel,
  roleLabel,
}: {
  email: string
  backHref: string
  backLabel: string
  roleLabel: string
}) {
  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold text-accent-800">{roleLabel} criado! ✓</p>
      <p className="text-sm text-ink-muted">
        Enviamos um link de uso único para <span className="font-medium text-ink">{email}</span> definir a senha e entrar.
      </p>
      <p className="text-xs text-ink-muted">
        O link é de uso único e expira conforme a política de recuperação de senha do Supabase.
      </p>
      <Link href={backHref} className="inline-block text-sm font-semibold text-brand-600">
        ← {backLabel}
      </Link>
    </Card>
  )
}
