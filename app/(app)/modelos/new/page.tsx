import { PageHeader } from '@/components/app/PageHeader'
import { ModeloForm } from '@/components/modelos/ModeloForm'

export const metadata = { title: 'Novo modelo de aula' }

export default function NewModeloPage() {
  return (
    <>
      <PageHeader title="Novo modelo de aula" subtitle="Reaproveite esta estrutura ao planejar aulas" />
      <ModeloForm />
    </>
  )
}
