import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { EditTeacherForm } from '@/components/admin/EditTeacherForm'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar professor' }

export default async function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await createAdminClient()
  const { data: teacher } = await admin
    .from('teachers')
    .select('id, user_id, instruments, users(name, email)')
    .eq('id', id)
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
