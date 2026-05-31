import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ProgressPanel } from '@/components/students/ProgressPanel'
import { getCurrentUser } from '@/lib/auth/session'
import { getStudentProgress } from '@/lib/data/progress'

export const metadata = { title: 'Meu progresso' }

export default async function StudentProgressPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const progress = await getStudentProgress(me.id)

  return (
    <>
      <PageHeader title="Meu progresso" subtitle="Sua evolução ao longo das aulas" />
      <ProgressPanel progress={progress} />
    </>
  )
}
