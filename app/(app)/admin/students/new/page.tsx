import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CreateStudentForm } from '@/components/admin/CreateStudentForm'
import { getCurrentUser } from '@/lib/auth/session'
import { listActiveTeachers } from '@/lib/queries/teachers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Novo aluno' }

export default async function NewStudentPage() {
  const user = await getCurrentUser()
  if (!user?.schoolId) redirect('/admin')

  const supabase = await createClient()
  const teachers = await listActiveTeachers(supabase, user.schoolId)

  return (
    <>
      <PageHeader title="Novo aluno" info="Cria o acesso e o perfil do aluno. A mensalidade é definida depois, ao matricular o aluno em um plano na ficha dele."
        back={{ href: '/admin/students', label: 'Alunos' }} />
      <CreateStudentForm teachers={teachers} />
    </>
  )
}
