import { redirect } from 'next/navigation'

import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import { getImpersonatorId } from '@/lib/actions/impersonate'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// Guarda da área autenticada. O middleware já bloqueia não-logados e roteia por
// papel; aqui garantimos o perfil e montamos o shell com a sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let schoolName: string | null = null
  if (user.schoolId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('schools')
      .select('custom_name, name')
      .eq('id', user.schoolId)
      .single()
    schoolName = (data?.custom_name as string) || (data?.name as string) || null
  }

  const impersonatorId = await getImpersonatorId()
  const isImpersonating = Boolean(impersonatorId)

  return (
    <div className="flex flex-col">
      {isImpersonating && <ImpersonationBanner asUserName={user.name} />}
      <div className="flex flex-1">
        <Sidebar role={user.role} name={user.name} schoolName={schoolName} />
        <main className="min-h-dvh flex-1 overflow-x-hidden px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
