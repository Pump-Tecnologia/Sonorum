import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { RoomsManager } from '@/components/admin/RoomsManager'
import { SchoolSettingsForm } from '@/components/admin/SchoolSettingsForm'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const [{ data: school }, { data: rooms }] = await Promise.all([
    supabase
      .from('schools')
      .select('name, custom_name, brand_primary, brand_secondary, plan_type, student_limit')
      .eq('id', user.schoolId)
      .single(),
    supabase.from('rooms').select('id, name, capacity').eq('school_id', user.schoolId).order('name'),
  ])

  if (!school) redirect('/admin')

  return (
    <>
      <PageHeader title="Configurações" subtitle="Identidade, salas e plano da escola" />
      <div className="space-y-6">
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
        <RoomsManager rooms={(rooms ?? []) as { id: string; name: string; capacity: number | null }[]} />
      </div>
    </>
  )
}
