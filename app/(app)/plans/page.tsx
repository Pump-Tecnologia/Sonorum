import { redirect } from 'next/navigation'

import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { type Plan } from '@/components/financial/PlanForm'
import { PlansList } from '@/components/financial/PlansList'
import { Button } from '@/components/ui/Button'
import { requireFeature } from '@/lib/auth/plan'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const metadata = { title: 'Planos' }

export default async function PlansPage() {
  await requireFeature('financial')
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')
  const schoolId = user.schoolId

  const supabase = await createClient()
  const [{ data: plans }, { data: students }, { data: enrolls }] = await Promise.all([
    supabase
      .from('plans')
      .select('id, name, description, amount, billing_type, early_pay_amount, min_age, max_age, active')
      .order('active', { ascending: false })
      .order('amount'),
    supabase.from('users').select('id, name').eq('school_id', schoolId).eq('role', 'student').order('name'),
    supabase.from('enrollments').select('plan_id').eq('school_id', schoolId).eq('status', 'active'),
  ])

  // Quantos alunos ativos em cada plano (conecta plano → matrícula).
  const counts: Record<string, number> = {}
  for (const e of (enrolls ?? []) as { plan_id: string }[]) {
    counts[e.plan_id] = (counts[e.plan_id] ?? 0) + 1
  }

  return (
    <>
      <PageHeader
        title="Planos de mensalidade"
        subtitle="Crie planos, matricule alunos e cobre no Financeiro"
        action={
          <Link href="/plans/new">
            <Button>Novo plano</Button>
          </Link>
        }
      />

      <PlansList
        plans={(plans ?? []) as Plan[]}
        counts={counts}
        students={(students ?? []) as { id: string; name: string }[]}
      />
    </>
  )
}
