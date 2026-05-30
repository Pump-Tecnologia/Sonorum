import Link from 'next/link'

import { Card } from '@/components/ui/Card'

// Resultado compartilhado após criar professor/aluno: mostra a senha temporária.
export function CreatePersonResult({
  email,
  tempPassword,
  backHref,
  backLabel,
  roleLabel,
}: {
  email: string
  tempPassword: string
  backHref: string
  backLabel: string
  roleLabel: string
}) {
  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold text-accent-800">{roleLabel} criado! ✓</p>
      <p className="text-sm text-ink-muted">
        Acesso: <span className="font-medium text-ink">{email}</span>
        <br />
        Senha temporária:{' '}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-ink">
          {tempPassword}
        </code>
      </p>
      <p className="text-xs text-ink-muted">
        Anote agora — esta senha não será exibida de novo. Oriente a trocá-la no primeiro acesso.
      </p>
      <Link href={backHref} className="inline-block text-sm font-semibold text-brand-600">
        ← {backLabel}
      </Link>
    </Card>
  )
}
