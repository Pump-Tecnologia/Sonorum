import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CreatePlanForm } from '@/components/financial/PlanForm'
import { PlansList } from '@/components/financial/PlansList'
import { Card } from '@/components/ui/Card'
import { requireFeature } from '@/lib/auth/plan'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const metadata = { title: 'Planos' }

export default async function PlansPage() {
  await requireFeature('financial')
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, amount')
    .order('amount')

  return (
    <>
      <PageHeader title="Planos de mensalidade" />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="mb-4 text-base font-semibold text-ink">Planos cadastrados</h2>
          <PlansList plans={(plans ?? []) as { id: string; name: string; description: string | null; amount: number }[]} />
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 text-base font-semibold text-ink">Novo plano</h2>
          <CreatePlanForm />
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Para matricular um aluno em um plano, acesse o{' '}
        <Link href="/admin/students" className="font-medium text-brand-600 hover:underline">perfil do aluno</Link>.
      </p>
    </>
  )
}
