import { notFound, redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { EditTeacherForm } from '@/components/admin/EditTeacherForm'
import { getPlanContext, isSoloExperience } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar professor' }

export default async function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) notFound()

  // Conta presa a 1 professor: edita nome/instrumentos/senha em /profile.
  const plan = await getPlanContext()
  if (isSoloExperience(plan)) redirect('/profile')

  const { id } = await params
  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, user_id, instruments, users(name, email)')
    .eq('id', id)
    .eq('school_id', me.schoolId)
    .maybeSingle()

  if (!teacher) notFound()

  const user = teacher.users as { name: string; email: string } | null

  return (
    <>
      <PageHeader title="Editar professor" subtitle={user?.name ?? ''} />
      <EditTeacherForm
        teacher={{
          id: teacher.id,
          userId: teacher.user_id,
          name: user?.name ?? '',
          email: user?.email ?? '',
          instruments: teacher.instruments as string[] | null,
        }}
      />
    </>
  )
}
