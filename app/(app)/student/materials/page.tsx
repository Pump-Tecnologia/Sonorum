import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrls } from '@/lib/storage/resources'

export const metadata = { title: 'Meus materiais' }

export default async function StudentMaterialsPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Recursos pedagógicos das aulas passadas do aluno (mesma lógica do Laravel)
  const { data } = await supabase
    .from('pedagogical_resources')
    .select(`
      id, title, description, category, difficulty, content_type, content_link, body, file_path,
      lesson_pedagogical_resource!inner(
        lessons!inner(student_id, start_datetime, status)
      )
    `)
    .eq('lesson_pedagogical_resource.lessons.student_id', user!.id)
    .lte('lesson_pedagogical_resource.lessons.start_datetime', new Date().toISOString())
    .neq('lesson_pedagogical_resource.lessons.status', 'canceled')
    .order('created_at', { ascending: false })

  const resources = data ?? []
  const fileUrls = await signedResourceUrls(resources.map((r) => r.file_path))

  const DIFF_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
    Iniciante: 'success',
    Intermediário: 'warning',
    Avançado: 'neutral',
  }

  return (
    <>
      <PageHeader title="Meus materiais" subtitle="Recursos pedagógicos das suas aulas" />

      {resources.length === 0 ? (
        <Card><p className="text-sm text-ink-muted">Nenhum material disponível ainda.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink leading-tight">{r.title}</p>
                <Badge tone={DIFF_TONE[r.difficulty] ?? 'neutral'}>{r.difficulty}</Badge>
              </div>
              {r.description && <p className="text-sm text-ink-muted">{r.description}</p>}
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-xs text-ink-muted">{r.category}</span>
                <span className="text-xs text-ink-muted">·</span>
                <span className="text-xs text-ink-muted">{r.content_type}</span>
              </div>
              {r.file_path && fileUrls[r.file_path] && (
                <a
                  href={fileUrls[r.file_path]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted"
                >
                  Baixar arquivo →
                </a>
              )}
              {r.content_link && (
                <a
                  href={r.content_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-surface-muted"
                >
                  Acessar material →
                </a>
              )}
              {r.body && !r.content_link && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-brand-600">Ver conteúdo</summary>
                  <p className="mt-2 whitespace-pre-wrap text-ink-muted">{r.body}</p>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
