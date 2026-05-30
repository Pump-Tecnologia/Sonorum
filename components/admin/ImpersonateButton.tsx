import { impersonate } from '@/lib/actions/impersonate'

export function ImpersonateButton({ targetUserId, label = 'Entrar como' }: { targetUserId: string; label?: string }) {
  return (
    <form action={impersonate}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <button type="submit" className="text-xs font-medium text-brand-600 hover:text-brand-700">
        {label}
      </button>
    </form>
  )
}
