'use client'

import { useFormStatus } from 'react-dom'

import styles from '@/components/auth/auth.module.css'

export function AuthSubmit({ children, pendingLabel }: { children: string; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? (pendingLabel ?? 'Aguarde…') : children}
    </button>
  )
}
