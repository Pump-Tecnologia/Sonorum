import { InfoButton } from '@/components/ds/InfoButton'
import { ResourceCard, TopicSection, type ResourceItem } from '@/components/resources/ResourceCard'
import { topicOrder } from '@/components/resources/resource-meta'
import styles from '@/components/resources/resources.module.css'
import { requireCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrls } from '@/lib/storage/resources'

export const metadata = { title: 'Meus materiais' }

type MaterialRow = ResourceItem & { file_path: string | null }

export default async function StudentMaterialsPage() {
  const user = await requireCurrentUser()
  const supabase = await createClient()

  // Recursos usados nas aulas que o aluno já teve (aulas canceladas ficam de fora).
  const { data } = await supabase
    .from('pedagogical_resources')
    .select(`
      id, title, description, category, difficulty, content_type, content_link, body, file_path, instrument, instrument_category,
      lesson_pedagogical_resource!inner(
        lessons!inner(student_id, start_datetime, status)
      )
    `)
    .eq('lesson_pedagogical_resource.lessons.student_id', user.id)
    .lte('lesson_pedagogical_resource.lessons.start_datetime', new Date().toISOString())
    .neq('lesson_pedagogical_resource.lessons.status', 'canceled')
    .order('created_at', { ascending: false })

  const materials = (data ?? []) as MaterialRow[]
  const fileUrls = await signedResourceUrls(materials.map((r) => r.file_path))
  const urlOf = (path: string | null) => (path ? fileUrls[path] ?? null : null)

  const groups = new Map<string, MaterialRow[]>()
  for (const m of materials) groups.set(m.category, [...(groups.get(m.category) ?? []), m])
  const count = `${materials.length} ${materials.length === 1 ? 'material' : 'materiais'}`

  return (
    <section className={styles.page} aria-labelledby="materials-title">
      <header className={styles.header}>
        <div>
          <h1 id="materials-title" className={styles.kicker}>Meus materiais</h1>
          <div className={styles.titleRow}>
            <p className={styles.title}>{materials.length ? count : 'Seus materiais'}</p>
            <InfoButton label="Sobre os materiais">Tudo o que o seu professor usou nas aulas, separado por tópico, para você praticar em casa.</InfoButton>
          </div>
        </div>
      </header>

      {materials.length === 0 ? (
        <p className={styles.empty}>Os materiais das suas aulas aparecem aqui assim que o professor usar o primeiro.</p>
      ) : (
        topicOrder(groups.keys()).map((category) => {
          const items = groups.get(category) ?? []
          return (
            <TopicSection key={category} category={category} count={items.length} unit={['material', 'materiais']}>
              {items.map((r, i) => <ResourceCard key={r.id} r={r} fileUrl={urlOf(r.file_path)} mode="student" index={i} />)}
            </TopicSection>
          )
        })
      )}
    </section>
  )
}
