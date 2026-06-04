'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
    <form onSubmit={apply} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-ink-muted">
        De
        <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-ink-muted">
        Até
        <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
      </label>
      <button
        type="submit"
        className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
      >
        Aplicar
      </button>
    </form>
  )
}
