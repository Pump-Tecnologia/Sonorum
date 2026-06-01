import { impersonate } from '@/lib/actions/impersonate'

export function ImpersonateButton({
  targetUserId,
  label = 'Entrar como',
}: {
  targetUserId: string
  label?: string
}) {
  return (
    <form action={impersonate} className="inline-flex">
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted"
      >
        {label}
      </button>
    </form>
  )
}
