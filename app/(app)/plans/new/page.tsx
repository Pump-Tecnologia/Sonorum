import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CreatePlanForm } from '@/components/financial/PlanForm'
import { Card } from '@/components/ui/Card'
import { getPlanContext } from '@/lib/auth/plan'

export const metadata = { title: 'Novo plano' }

export default async function NewPlanPage() {
  const plan = await getPlanContext()
  if (!plan.features.financial) {
    redirect('/plans')
  }

  return (
    <>
      <PageHeader title="Novo plano" info="Defina nome, cobrança e restrições." back={{ href: '/plans', label: 'Planos' }} />
      <div className="max-w-5xl">
        <Card>
          <CreatePlanForm redirectTo="/plans" />
        </Card>
      </div>
    </>
  )
}
