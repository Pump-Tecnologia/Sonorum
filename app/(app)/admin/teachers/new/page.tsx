import { PageHeader } from '@/components/app/PageHeader'
import { CreateTeacherForm } from '@/components/admin/CreateTeacherForm'

export const metadata = { title: 'Novo professor' }

export default function NewTeacherPage() {
  return (
    <>
      <PageHeader title="Novo professor" subtitle="Cria o acesso e o perfil do professor" />
      <CreateTeacherForm />
    </>
  )
}
