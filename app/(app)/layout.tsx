import { redirect } from 'next/navigation'
import { cache } from 'react'

import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import styles from '@/components/app/app.module.css'
import { getImpersonatorId } from '@/lib/actions/impersonate'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// Memoiza a leitura do nome da escola por request — o shell é o único
// caller, mas garante uma única query mesmo se chamado em outros lugares.
const getSchoolName = cache(async (schoolId: string | null): Promise<string | null> => {
  if (!schoolId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('custom_name, name')
    .eq('id', schoolId)
    .single()
  return (data?.custom_name as string) || (data?.name as string) || null
})

// Guarda da área autenticada. O middleware já bloqueia não-logados e roteia por
// papel; aqui garantimos o perfil e montamos o shell com a sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Paraleliza user + cookie de impersonação (ambos independentes)
  const [user, impersonatorId] = await Promise.all([getCurrentUser(), getImpersonatorId()])
  if (!user) redirect('/login')

  // Só busca schoolName se houver schoolId — usuário superadmin não tem escola.
  const schoolName = await getSchoolName(user.schoolId)

  // Banner só faz sentido quando o impersonador é OUTRA conta (não a própria do
  // user). Cobre o caso de cookie stale.
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
