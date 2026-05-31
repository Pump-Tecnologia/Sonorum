import styles from '@/components/app/app.module.css'
import { impersonate } from '@/lib/actions/impersonate'

export function ImpersonateButton({
  targetUserId,
  label = 'Entrar como',
}: {
  targetUserId: string
  label?: string
}) {
  return (
    <form action={impersonate} style={{ display: 'inline-flex' }}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <button type="submit" className={styles.rowLink} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        {label}
      </button>
    </form>
  )
}
