import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { CreatePlanForm } from '@/components/financial/PlanForm'
import { Card } from '@/components/ui/Card'
import { requireFeature } from '@/lib/auth/plan'

export const metadata = { title: 'Novo plano' }

export default async function NewPlanPage() {
  await requireFeature('financial')

  return (
    <>
      <PageHeader title="Novo plano" subtitle="Defina nome, cobrança e restrições" />
      <Link href="/plans" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand-600">
        ← Voltar para planos
      </Link>
      <div className="max-w-5xl">
        <Card>
          <CreatePlanForm redirectTo="/plans" />
        </Card>
      </div>
    </>
  )
}
