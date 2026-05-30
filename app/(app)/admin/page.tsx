import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { dayRange, formatBRL, monthRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const plan = await getPlanContext()

  const today = dayRange()
  const month = monthRange()

  const [teachers, lessonsToday, charges] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end),
    plan.features.financial
      ? supabase.from('charges').select('amount').gte('due_date', month.start).lte('due_date', month.end)
      : Promise.resolve({ data: [] as { amount: number }[] }),
  ])

  const expectedRevenue = (charges.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const isFree = !plan.features.financial
  const studentLimitLabel = Number.isFinite(plan.features.studentLimit)
    ? `${plan.studentCount}/${plan.features.studentLimit}`
    : String(plan.studentCount)

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Bem-vindo, ${user?.name ?? ''}`} />

      {isFree && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50/50">
          <div>
            <p className="text-sm font-semibold text-ink">
              Plano {plan.features.label} · {studentLimitLabel} alunos
            </p>
            <p className="text-sm text-ink-muted">
              Faça upgrade para alunos ilimitados, financeiro e relatórios.
            </p>
          </div>
          <Link href="/upgrade">
            <Button>Fazer upgrade</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos" value={studentLimitLabel} />
        <StatCard label="Professores" value={teachers.count ?? 0} />
        <StatCard label="Aulas hoje" value={lessonsToday.count ?? 0} />
        {plan.features.financial ? (
          <StatCard label="Receita prevista (mês)" value={formatBRL(expectedRevenue)} />
        ) : (
          <StatCard label="Receita prevista" value="—" hint="Disponível em planos pagos" />
        )}
      </div>
    </>
  )
}
