import { PlainSubmit } from '@/components/ds/PlainSubmit'
import { impersonate } from '@/lib/actions/impersonate'

// A troca de sessão leva alguns segundos: o botão mostra "Entrando…" enquanto isso.
export function ImpersonateButton({
  targetUserId,
  label = 'Entrar como',
  className,
}: {
  targetUserId: string
  label?: string
  /** Substitui o estilo padrão do botão (ex.: item do menu "⋯"). */
  className?: string
}) {
  return (
    <form action={impersonate} className={className ? undefined : 'inline-flex'}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <PlainSubmit className={className ?? 'sn-btn sn-btn-sm sn-btn-secondary'} pendingLabel="Entrando…">
        {label}
      </PlainSubmit>
    </form>
  )
}
