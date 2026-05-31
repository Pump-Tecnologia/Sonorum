'use client'

import { useFormStatus } from 'react-dom'

import styles from '@/components/app/app.module.css'

type Variant = 'primary' | 'secondary'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
}

export function AppSubmit({
  children,
  pendingLabel,
  variant = 'primary',
}: {
  children: string
  pendingLabel?: string
  variant?: Variant
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className={`${styles.btn} ${VARIANT_CLASS[variant]}`}
      disabled={pending}
    >
      {pending ? (pendingLabel ?? 'Aguarde…') : children}
    </button>
  )
}
