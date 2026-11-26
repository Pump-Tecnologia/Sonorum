import { Card } from '@/components/ui/Card'

// Número grande e fino sobre vidro, como no progresso da ficha do aluno.
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <Card className="p-5">
      <p className="sn-stat-label">{label}</p>
      <p className="sn-stat-value">{value}</p>
      {hint && <p className="sn-stat-hint">{hint}</p>}
    </Card>
  )
}
