import { LinkButton } from '@/components/ds/Button'
import { IconArrowLeft, IconCheck } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
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
    <Card className="max-w-xl" role="status">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-(--sn-mint-soft) text-(--sn-ink-soft)" aria-hidden="true">
        <IconCheck className="h-6 w-6" />
      </span>
      <h2 className="m-0 text-2xl font-semibold tracking-tight text-(--sn-ink)">{roleLabel} criado</h2>
      <p className="mt-2 flex items-center gap-1 text-[15px] leading-relaxed text-(--sn-text-muted)">
        <span>Enviamos para <strong className="font-medium text-(--sn-ink)">{email}</strong> um link para definir a senha e entrar.</span>
        <InfoButton label="Sobre o link de acesso">O link só funciona uma vez e expira conforme a política de recuperação de senha.</InfoButton>
      </p>
      <LinkButton href={backHref} variant="soft" className="mt-6"><IconArrowLeft /> {backLabel}</LinkButton>
    </Card>
  )
}
