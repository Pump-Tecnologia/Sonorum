import { PageHeader } from '@/components/app/PageHeader'
import { ResourceForm } from '@/components/resources/ResourceForm'

export const metadata = { title: 'Novo recurso' }

export default function NewResourcePage() {
  return (
    <>
      <PageHeader title="Novo recurso" subtitle="Adicione à biblioteca pedagógica" />
      <ResourceForm />
    </>
  )
}
