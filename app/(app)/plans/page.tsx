import { redirect } from 'next/navigation'

import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { LockedFeatureCard } from '@/components/billing/LockedFeatureCard'
import { type Plan } from '@/components/financial/PlanForm'
import { PlansList } from '@/components/financial/PlansList'
import { Button } from '@/components/ui/Button'
import { getPlanContext } from '@/lib/auth/plan'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export const metadata = { title: 'Planos' }

export default async function PlansPage() {
  const [user, plan] = await Promise.all([getCurrentUser(), getPlanContext()])
  if (!user?.schoolId) redirect('/admin')
  const schoolId = user.schoolId

  if (!plan.features.financial) {
    return (
      <>
        <PageHeader
          title="Planos de mensalidade"
          subtitle="Crie planos, matricule alunos e cobre no Financeiro"
        />
        <LockedFeatureCard
          title="Planos de Mensalidade"
          subtitle="Organize as modalidades de cobrança dos seus alunos"
          description="Crie planos mensais ou baseados em aulas realizadas, com regras flexíveis de vencimento e descontos de pontualidade para incentivar o pagamento em dia."
          benefits={[
            'Planos com cobrança mensal fixa ou valor por aula realizada',
            'Dia de vencimento configurável por aluno ou por turma',
            'Desconto automático de pontualidade para quem pagar até a data limite',
            'Matrícula rápida de alunos com valores padrão ou valores customizados',
            'Integração total com a geração de cobranças do módulo Financeiro',
          ]}
          planRequirement="Disponível a partir do plano Solo (R$ 49,90/mês) ou Profissional (R$ 99/mês)."
          isExpired={plan.isExpired}
          inGracePeriod={plan.inGracePeriod}
          graceDaysRemaining={plan.graceDaysRemaining}
        />
      </>
    )
  }

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
