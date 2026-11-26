import { impersonate } from '@/lib/actions/impersonate'

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
      <button
        type="submit"
        className={className ?? 'sn-btn sn-btn-sm sn-btn-secondary'}
      >
        {label}
      </button>
    </form>
  )
}
