import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CreateStudentForm } from '@/components/admin/CreateStudentForm'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Novo aluno' }

export default async function NewStudentPage() {
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const { data: teachers } = await supabase
    .from('users')
    .select('id, name')
    .eq('school_id', user.schoolId)
    .eq('role', 'teacher')
    .eq('status', 'active')
    .order('name')

  return (
    <>
      <PageHeader title="Novo aluno" subtitle="Cria o acesso e o perfil do aluno" />
      <CreateStudentForm teachers={(teachers ?? []) as { id: string; name: string }[]} />
    </>
  )
}
