import { ComingSoon } from '@/components/app/ComingSoon'
import { PageHeader } from '@/components/app/PageHeader'
import { getCurrentUser } from '@/lib/auth/session'

export default async function StudentDashboard() {
  const user = await getCurrentUser()
  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Olá, ${user?.name ?? ''}`} />
      <ComingSoon phase="Fase 7 — Student" />
    </>
  )
}
