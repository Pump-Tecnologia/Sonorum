import Link from 'next/link'
import { notFound } from 'next/navigation'

import { IconArrowLeft } from '@/components/ds/icons'
import { CoverImage } from '@/components/resources/ResourceCard'
import { coverFor } from '@/components/resources/resource-meta'
import { ResourceForm } from '@/components/resources/ResourceForm'
import styles from '@/components/resources/resources.module.css'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrl } from '@/lib/storage/resources'

export const metadata = { title: 'Editar recurso' }

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: resource } = await supabase
    .from('pedagogical_resources')
    .select('id, title, category, instrument_category, instrument, difficulty, content_type, body, content_link, description, file_path')
    .eq('id', id)
    .maybeSingle()

  if (!resource) notFound()

  const currentFileUrl = await signedResourceUrl(resource.file_path)
  const kind = resource.file_path?.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'image' as const
  const currentFile = currentFileUrl ? { url: currentFileUrl, kind } : null
  const cover = coverFor(resource, { path: resource.file_path, url: currentFileUrl })

  return (
    <section className={styles.page} aria-labelledby="edit-resource-title">
      <Link href="/resources" className={styles.backLink}><IconArrowLeft /> Recursos</Link>
      <header className={styles.editHeader}>
        <CoverImage cover={cover} className={styles.editThumb} />
        <div>
          <h1 id="edit-resource-title" className={styles.kicker}>Editando</h1>
          <p className={styles.title}>{resource.title}</p>
        </div>
      </header>
      <ResourceForm resource={resource} currentFile={currentFile} />
    </section>
  )
}
