import { PageHeader } from '@/components/app/PageHeader'
import { CreateSchoolForm } from '@/components/superadmin/CreateSchoolForm'

export const metadata = { title: 'Nova escola' }

export default function NewSchoolPage() {
  return (
    <>
      <PageHeader title="Nova escola" info="Cria a escola e o usuário administrador." back={{ href: '/superadmin', label: 'Visão geral' }} />
      <CreateSchoolForm />
    </>
  )
}
