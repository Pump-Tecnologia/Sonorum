import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ResourceForm } from '@/components/resources/ResourceForm'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar recurso' }

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: resource } = await supabase
    .from('pedagogical_resources')
    .select('id, title, category, instrument_category, instrument, difficulty, content_type, body, content_link, description')
    .eq('id', id)
    .maybeSingle()

  if (!resource) notFound()

  return (
    <>
      <PageHeader title="Editar recurso" subtitle={resource.title} />
      <ResourceForm resource={resource} />
    </>
  )
}
