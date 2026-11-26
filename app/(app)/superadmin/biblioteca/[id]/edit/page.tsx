import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { TemplateForm } from '@/components/superadmin/TemplateForm'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar recurso do catálogo' }

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: template } = await supabase
    .from('resource_templates')
    .select('id, title, description, category, instrument_category, instrument, difficulty, content_type, body, content_link')
    .eq('id', id)
    .maybeSingle()

  if (!template) notFound()

  return (
    <>
      <PageHeader title="Editar recurso do catálogo" subtitle={template.title} info="Ao salvar, o recurso ganha uma nova versão no catálogo." back={{ href: '/superadmin/biblioteca', label: 'Biblioteca global' }} />
      <TemplateForm template={template} />
    </>
  )
}
