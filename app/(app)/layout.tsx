import { redirect } from 'next/navigation'

import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import styles from '@/components/app/app.module.css'
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
  // Banner só faz sentido quando o impersonador é OUTRA conta (não a própria do
  // user). Cobre o caso de cookie stale: o user voltou para a própria conta sem
  // passar pelo stopImpersonating, ou fez login normal com o cookie pendente.
  const isImpersonating = Boolean(impersonatorId) && impersonatorId !== user.id

  return (
    <div className={styles.shell}>
      {isImpersonating && <ImpersonationBanner asUserName={user.name} />}
      <div className={styles.shellMain}>
        <Sidebar role={user.role} name={user.name} schoolName={schoolName} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
