'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/Button'

export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (pendingLabel ?? 'Aguarde…') : children}
    </Button>
  )
}
