import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ImportForm } from '@/components/admin/ImportForm'
import { Card } from '@/components/ui/Card'
import { getPlanContext, isSoloExperience } from '@/lib/auth/plan'
import { importTeachers } from '@/lib/actions/import'

export const metadata = { title: 'Importar professores' }

export default async function ImportTeachersPage() {
  // Conta presa a 1 professor: importar vários não faz sentido.
  const plan = await getPlanContext()
  if (isSoloExperience(plan)) redirect('/profile')

  return (
    <>
      <PageHeader title="Importar professores" info="Crie vários professores de uma vez." back={{ href: '/admin/teachers', label: 'Professores' }} />
      <div className="max-w-2xl">
        <Card>
          <ImportForm
            action={importTeachers}
            help="Formato: nome, e-mail e instrumentos (opcional, separados por vírgula)."
            placeholder={'Carla Dias, carla@email.com, Violão, Piano\nDiego Reis, diego@email.com'}
          />
        </Card>
      </div>
    </>
  )
}
