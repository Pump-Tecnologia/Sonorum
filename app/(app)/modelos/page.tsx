import Link from 'next/link'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { DashHeader } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { LinkButton } from '@/components/ds/Button'
import { IconPlus } from '@/components/ds/icons'
import { deleteLessonPlanTemplate } from '@/lib/actions/lesson-templates'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Modelos de aula' }

export default async function ModelosPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('lesson_plan_templates')
    .select('id, name, instrument_category, instrument, goals, warmup_note, repertoire_note, homework_note, target_bpm')
    .order('name')

  const list = templates ?? []

  return (
    <div className={styles.page}>
      <DashHeader
        title="Modelos de aula"
        info="Planos prontos para reaproveitar, por instrumento. Na tela da aula também dá para salvar o plano como modelo."
        actions={<LinkButton href="/modelos/new"><IconPlus /> Novo modelo</LinkButton>}
      />

      {list.length === 0 ? (
        <section className={styles.panel} aria-label="Modelos">
          <p className={styles.empty}>Nenhum modelo ainda.</p>
        </section>
      ) : (
        <ul className={styles.cards} aria-label="Modelos">
          {list.map((t) => {
            const sections = [
              t.warmup_note && 'Aquecimento',
              t.repertoire_note && 'Repertório',
              t.homework_note && 'Tarefa',
              t.target_bpm && 'BPM',
            ].filter(Boolean) as string[]
            const instrument = t.instrument || t.instrument_category
            return (
              <li key={t.id} className={`${styles.panel} ${styles.card}`}>
                <div className={styles.cardHead}>
                  <Link href={`/modelos/${t.id}/edit`} className={styles.cardTitle}>{t.name}</Link>
                  {instrument && <span className={styles.chip} data-tone={instrumentTone(instrument)}>{instrument}</span>}
                </div>
                {t.goals && <p className={styles.cardText}>{t.goals}</p>}
                {sections.length > 0 && (
                  <ul className={styles.tags} aria-label="Partes preenchidas">
                    {sections.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                )}
                <div className={styles.cardFoot}>
                  <LinkButton href={`/modelos/${t.id}/edit`} variant="soft" size="sm">Editar</LinkButton>
                  <DeleteButton
                    action={deleteLessonPlanTemplate}
                    hidden={{ templateId: t.id }}
                    label="Excluir"
                    confirmText={`Excluir o modelo "${t.name}"?`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
