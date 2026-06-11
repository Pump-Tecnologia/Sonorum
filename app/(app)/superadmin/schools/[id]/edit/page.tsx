import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { SchoolEditForm } from '@/components/superadmin/SchoolEditForm'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar escola' }

export default async function EditSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await createAdminClient()
  const { data: school } = await admin
    .from('schools')
    .select('id, name, custom_name, plan_type, monthly_price, expiration_date, feature_overrides')
    .eq('id', id)
    .maybeSingle()

  if (!school) notFound()

  // feature_overrides é jsonb — normaliza para um mapa de booleanos.
  const rawOverrides = school.feature_overrides
  const featureOverrides: Record<string, boolean> =
    rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)
      ? Object.fromEntries(
          Object.entries(rawOverrides as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'boolean',
          ) as [string, boolean][],
        )
      : {}

  return (
    <>
      <PageHeader title="Editar escola" subtitle={school.custom_name || school.name} />
      <SchoolEditForm
        school={{
          id: school.id,
          name: school.custom_name || school.name,
          planType: school.plan_type ?? 'free',
          monthlyPrice: Number(school.monthly_price ?? 0),
          expirationDate: school.expiration_date ?? null,
          featureOverrides,
        }}
      />
    </>
  )
}
