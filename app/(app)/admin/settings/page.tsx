import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { NotificationChannelCard } from '@/components/admin/NotificationChannelCard'
import { RoomsManager } from '@/components/admin/RoomsManager'
import { SchoolSettingsForm, PlanSummaryCard } from '@/components/admin/SchoolSettingsForm'
import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures } from '@/lib/constants/plans'
import { isWhatsAppCloudEnabled } from '@/lib/notifications/whatsapp-cloud'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const [{ data: school }, { data: rooms }] = await Promise.all([
    supabase
      .from('schools')
      .select('name, custom_name, brand_primary, brand_secondary, logo_path, plan_type, student_limit, pix_key, pix_key_type, pix_city')
      .eq('id', user.schoolId)
      .single(),
    supabase.from('rooms').select('id, name').eq('school_id', user.schoolId).order('name'),
  ])

  if (!school) redirect('/admin')

  return (
    <>
      <PageHeader title="Configurações" subtitle="Identidade, salas e plano da escola" />
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form principal */}
        <div className="lg:col-span-2">
          <SchoolSettingsForm
            school={{
              name: school.name,
              customName: school.custom_name,
              brandPrimary: school.brand_primary,
              logoUrl: school.logo_path,
              planType: school.plan_type,
              studentLimit: school.student_limit,
              pixKey: school.pix_key,
              pixKeyType: school.pix_key_type,
              pixCity: school.pix_city,
            }}
            canBrand={planFeatures(school.plan_type).branding}
          />
        </div>

        {/* Lateral: cards pequenos */}
        <div className="space-y-6">
          <PlanSummaryCard planType={school.plan_type} />
          <NotificationChannelCard
            whatsappOfficial={planFeatures(school.plan_type).whatsappOfficial}
            whatsappActive={isWhatsAppCloudEnabled()}
          />
          <RoomsManager rooms={(rooms ?? []) as { id: string; name: string }[]} />
        </div>
      </div>
    </>
  )
}
