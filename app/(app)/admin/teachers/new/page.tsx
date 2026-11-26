import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { CreateTeacherForm } from '@/components/admin/CreateTeacherForm'
import { getPlanContext, isSoloExperience } from '@/lib/auth/plan'

export const metadata = { title: 'Novo professor' }

export default async function NewTeacherPage() {
  // Conta presa a 1 professor: já é o próprio admin, não cria outro.
  const plan = await getPlanContext()
  if (isSoloExperience(plan)) redirect('/profile')

  return (
    <>
      <PageHeader title="Novo professor" info="Cria o acesso e o perfil do professor."
        back={{ href: '/admin/teachers', label: 'Professores' }} />
      <CreateTeacherForm />
    </>
  )
}
