import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { SchoolSettingsForm } from '@/components/admin/SchoolSettingsForm'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const { data: school } = await supabase
    .from('schools')
    .select('name, custom_name, brand_primary, brand_secondary, plan_type, student_limit')
    .eq('id', user.schoolId)
    .single()

  if (!school) redirect('/admin')

  return (
    <>
      <PageHeader title="Configurações" subtitle="Identidade e plano da escola" />
      <SchoolSettingsForm
        school={{
          name: school.name,
          customName: school.custom_name,
          brandPrimary: school.brand_primary,
          brandSecondary: school.brand_secondary,
          planType: school.plan_type,
          studentLimit: school.student_limit,
        }}
      />
    </>
  )
}
