import { PageHeader } from '@/components/app/PageHeader'
import { ImportForm } from '@/components/admin/ImportForm'
import { Card } from '@/components/ui/Card'
import { importStudents } from '@/lib/actions/import'

export const metadata = { title: 'Importar alunos' }

export default function ImportStudentsPage() {
  return (
    <>
      <PageHeader title="Importar alunos" info="Crie vários alunos de uma vez." back={{ href: '/admin/students', label: 'Alunos' }} />
      <div className="max-w-2xl">
        <Card>
          <ImportForm
            action={importStudents}
            help="Formato: nome, e-mail, telefone (opcional) e responsável (opcional)."
            placeholder={'Ana Souza, ana@email.com, 33999990000\nBruno Lima, bruno@email.com'}
          />
        </Card>
      </div>
    </>
  )
}
