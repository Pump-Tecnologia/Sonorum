'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'

// Filtro de período (intervalo livre) dos relatórios. Submete via ?from&to.
export function ReportDateRange({ from, to }: { from: string; to: string }) {
  const router = useRouter()
  const [start, setStart] = useState(from)
  const [end, setEnd] = useState(to)

  function apply(e: React.FormEvent) {
    e.preventDefault()
    if (!start || !end) return
    router.push(`/admin/reports?from=${start}&to=${end}`)
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
        De
        <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
        Até
        <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <Button type="submit" variant="secondary">Aplicar</Button>
    </form>
  )
}
