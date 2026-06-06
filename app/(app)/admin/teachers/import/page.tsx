import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { ImportForm } from '@/components/admin/ImportForm'
import { Card } from '@/components/ui/Card'
import { importTeachers } from '@/lib/actions/import'

export const metadata = { title: 'Importar professores' }

export default function ImportTeachersPage() {
  return (
    <>
      <PageHeader title="Importar professores" subtitle="Crie vários professores de uma vez" />
      <Link href="/admin/teachers" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand-600">
        ← Voltar para professores
      </Link>
      <div className="max-w-2xl">
        <Card>
          <ImportForm
            action={importTeachers}
            help="Cole um professor por linha no formato: Nome, e-mail, instrumentos (opcional, separados por vírgula)."
            placeholder={'Carla Dias, carla@email.com, Violão, Piano\nDiego Reis, diego@email.com'}
          />
        </Card>
      </div>
    </>
  )
}
