import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ModeloForm } from '@/components/modelos/ModeloForm'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editar modelo de aula' }

export default async function EditModeloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: template } = await supabase
    .from('lesson_plan_templates')
    .select('id, name, instrument_category, instrument, goals, warmup_note, repertoire_note, homework_note, target_bpm')
    .eq('id', id)
    .maybeSingle()

  if (!template) notFound()

  return (
    <>
      <PageHeader title="Editar modelo de aula" subtitle={template.name} />
      <ModeloForm template={template} />
    </>
  )
}
