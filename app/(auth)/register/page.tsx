import type { Metadata } from 'next'
import { Suspense } from 'react'

import { RegisterForm } from '@/components/auth/RegisterForm'
import styles from '@/components/auth/auth.module.css'
import { PLAN_FEATURES, SELLABLE_PLANS, planPrice } from '@/lib/constants/plans'
import { formatBRL } from '@/lib/format'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  const sellable = SELLABLE_PLANS.includes(plan as (typeof SELLABLE_PLANS)[number])
  const f = sellable ? PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] : null

  return (
    <>
      <h1 className={styles.title}>{f ? `Assinar plano ${f.label}` : 'Criar conta grátis'}</h1>
      <p className={styles.subtitle}>
        {f
          ? `Crie sua conta e finalize o pagamento — ${formatBRL(planPrice(plan!))}/mês no cartão, cancele quando quiser.`
          : 'Crie sua conta no plano Essencial e comece hoje, sem cartão.'}
      </p>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </>
  )
}
