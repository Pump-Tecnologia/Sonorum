import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { ImportForm } from '@/components/admin/ImportForm'
import { Card } from '@/components/ui/Card'
import { importStudents } from '@/lib/actions/import'

export const metadata = { title: 'Importar alunos' }

export default function ImportStudentsPage() {
  return (
    <>
      <PageHeader title="Importar alunos" subtitle="Crie vários alunos de uma vez" />
      <Link href="/admin/students" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand-600">
        ← Voltar para alunos
      </Link>
      <div className="max-w-2xl">
        <Card>
          <ImportForm
            action={importStudents}
            help="Cole uma pessoa por linha no formato: Nome, e-mail, telefone (opcional), responsável (opcional)."
            placeholder={'Ana Souza, ana@email.com, 33999990000\nBruno Lima, bruno@email.com'}
          />
        </Card>
      </div>
    </>
  )
}
