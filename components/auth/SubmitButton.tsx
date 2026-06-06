'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'

export function SubmitButton({
  children,
  pendingLabel,
  fullWidth = true,
}: {
  children: string
  pendingLabel?: string
  fullWidth?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className={fullWidth ? 'w-full' : undefined} disabled={pending}>
      {pending ? (pendingLabel ?? 'Aguarde…') : children}
    </Button>
  )
}
