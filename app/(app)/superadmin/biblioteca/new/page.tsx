import { PageHeader } from '@/components/app/PageHeader'
import { TemplateForm } from '@/components/superadmin/TemplateForm'

export const metadata = { title: 'Novo recurso do catálogo' }

export default function NewTemplatePage() {
  return (
    <>
      <PageHeader title="Novo recurso do catálogo" subtitle="Vai como cópia editável para as escolas" />
      <TemplateForm />
    </>
  )
}
