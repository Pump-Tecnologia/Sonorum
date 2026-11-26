'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Field'
import styles from '@/components/dashboard/dashboard.module.css'

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
    <form onSubmit={apply} className={styles.range} aria-label="Período">
      <Input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} aria-label="De" />
      <span className={styles.rangeSep}>até</span>
      <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-label="Até" />
      <Button type="submit" variant="soft">Aplicar</Button>
    </form>
  )
}
