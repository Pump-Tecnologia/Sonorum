import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { RestoreButton } from '@/components/admin/RestoreButton'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deleteResource, restoreLibrary, restoreResource } from '@/lib/actions/resources'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrls } from '@/lib/storage/resources'

export const metadata = { title: 'Recursos pedagógicos' }

const DIFF_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  Iniciante: 'success',
  Intermediário: 'warning',
  Avançado: 'neutral',
}

export default async function ResourcesPage() {
  const supabase = await createClient()
  const { data: resources } = await supabase
    .from('pedagogical_resources')
    .select('id, title, description, category, difficulty, content_type, instrument, instrument_category, content_link, file_path, template_id, customized')
    .order('created_at', { ascending: false })

  const list = resources ?? []
  const fileUrls = await signedResourceUrls(list.map((r) => r.file_path))

  return (
    <>
      <PageHeader
        title="Recursos pedagógicos"
        subtitle={`${list.length} recurso(s) na biblioteca`}
        action={
          <div className="flex items-center gap-2">
            <form action={restoreLibrary}>
              <button type="submit" className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-brand-300">
                Restaurar biblioteca
              </button>
            </form>
            <Link href="/resources/new">
              <Button>Novo recurso</Button>
            </Link>
          </div>
        }
      />

      {list.length === 0 ? (
        <Card><p className="text-sm text-ink-muted">Nenhum recurso cadastrado ainda. Crie o primeiro para usar nas aulas.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink leading-tight">{r.title}</p>
                <Badge tone={DIFF_TONE[r.difficulty] ?? 'neutral'}>{r.difficulty}</Badge>
              </div>
              {r.description && <p className="text-sm text-ink-muted">{r.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
                <span>{r.category}</span>
                <span>·</span>
                <span>{r.content_type}</span>
                {r.instrument && <><span>·</span><span>{r.instrument}</span></>}
                {r.instrument_category && !r.instrument && <><span>·</span><span>{r.instrument_category}</span></>}
                {r.template_id && <><span>·</span><span className="font-medium text-brand-600">do catálogo{r.customized ? ' (editado)' : ''}</span></>}
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
              <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                <div className="flex items-center gap-2">
                  <LinkButton href={`/resources/${r.id}/edit`} variant="secondary" size="sm">Editar</LinkButton>
                  {r.template_id && (
                    <RestoreButton
                      action={restoreResource}
                      hidden={{ resourceId: r.id }}
                      label="Restaurar"
                      confirmText="Restaurar este recurso para a versão do catálogo? Suas edições serão perdidas."
                    />
                  )}
                </div>
                <DeleteButton
                  action={deleteResource}
                  hidden={{ resourceId: r.id }}
                  label="Excluir"
                  confirmText={`Excluir o recurso "${r.title}"?`}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
