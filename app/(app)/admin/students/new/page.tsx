import { PageHeader } from '@/components/app/PageHeader'
import { CreateStudentForm } from '@/components/admin/CreateStudentForm'

export const metadata = { title: 'Novo aluno' }

export default function NewStudentPage() {
  return (
    <>
      <PageHeader title="Novo aluno" subtitle="Cria o acesso e o perfil do aluno" />
      <CreateStudentForm />
    </>
  )
}
