'use client'

import { useRouter } from 'next/navigation'

interface Props {
  month: string
}

// Seletor de mês do Financeiro. Client Component porque o <input> precisa de
// onChange — navega via router (sem reload de página inteira).
export function MonthPicker({ month }: Props) {
  const router = useRouter()

  return (
    <input
      type="month"
      defaultValue={month}
      onChange={(e) => router.push(`/financial?month=${e.target.value}`)}
      className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm"
    />
  )
}
