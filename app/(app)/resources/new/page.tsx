import Link from 'next/link'

import { IconArrowLeft } from '@/components/ds/icons'
import { ResourceForm } from '@/components/resources/ResourceForm'
import styles from '@/components/resources/resources.module.css'

export const metadata = { title: 'Novo recurso' }

export default function NewResourcePage() {
  return (
    <section className={styles.page} aria-labelledby="new-resource-title">
      <Link href="/resources" className={styles.backLink}><IconArrowLeft /> Recursos</Link>
      <header className={styles.header}>
        <div>
          <h1 id="new-resource-title" className={styles.kicker}>Novo recurso</h1>
          <p className={styles.title}>Para usar nas aulas</p>
        </div>
      </header>
      <ResourceForm />
    </section>
  )
}
