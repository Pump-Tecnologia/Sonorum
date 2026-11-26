import { PageHeader } from '@/components/app/PageHeader'
import { ModeloForm } from '@/components/modelos/ModeloForm'

export const metadata = { title: 'Novo modelo de aula' }

export default function NewModeloPage() {
  return (
    <>
      <PageHeader title="Novo modelo de aula" info="Reaproveite esta estrutura ao planejar aulas. O instrumento ajuda a sugerir o modelo nas aulas do aluno certo." back={{ href: '/modelos', label: 'Modelos de aula' }} />
      <ModeloForm />
    </>
  )
}
