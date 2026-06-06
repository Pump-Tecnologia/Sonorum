import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { RestoreButton } from '@/components/admin/RestoreButton'
import { ResourceFilters } from '@/components/resources/ResourceFilters'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CATEGORIES, DIFFICULTIES, INST_CATEGORIES } from '@/lib/constants/resources'
import { deleteResource, restoreLibrary, restoreResource } from '@/lib/actions/resources'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrls } from '@/lib/storage/resources'

export const metadata = { title: 'Recursos pedagógicos' }

const DIFF_TONE: Record<string, 'success' | 'warning' | 'neutral'> = {
  Iniciante: 'success',
  Intermediário: 'warning',
  Avançado: 'neutral',
}

type SearchParams = { q?: string; category?: string; instrument?: string; difficulty?: string; view?: string }

function pick(value: string | undefined, allowed: readonly string[]): string {
  return value && allowed.includes(value) ? value : ''
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const cat = pick(sp.category, CATEGORIES)
  const inst = pick(sp.instrument, INST_CATEGORIES)
  const diff = pick(sp.difficulty, DIFFICULTIES)
  const view: 'grid' | 'list' = sp.view === 'list' ? 'list' : 'grid'

  const supabase = await createClient()
  let query = supabase
    .from('pedagogical_resources')
    .select('id, title, description, category, difficulty, content_type, instrument, instrument_category, content_link, file_path, template_id, customized')
    .order('created_at', { ascending: false })

  if (cat) query = query.eq('category', cat)
  if (inst) query = query.eq('instrument_category', inst)
  if (diff) query = query.eq('difficulty', diff)
  if (q) {
    const safe = q.replace(/[,()]/g, ' ')
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,instrument.ilike.%${safe}%`)
  }

  const { data: resources } = await query
  const list = resources ?? []
  const fileUrls = await signedResourceUrls(list.map((r) => r.file_path))
  const hasFilters = Boolean(q || cat || inst || diff)

  return (
    <>
      <PageHeader
        title="Recursos pedagógicos"
        subtitle={`${list.length} recurso(s)${hasFilters ? ' no filtro' : ' na biblioteca'}`}
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

      <ResourceFilters q={q} cat={cat} inst={inst} diff={diff} view={view} />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            {hasFilters
              ? 'Nenhum recurso para esse filtro. Ajuste ou limpe os filtros.'
              : 'Nenhum recurso cadastrado ainda. Crie o primeiro para usar nas aulas.'}
          </p>
        </Card>
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <ul className="divide-y divide-hairline">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium leading-tight text-ink">{r.title}</p>
                  {r.description && <p className="truncate text-xs text-ink-muted">{r.description}</p>}
                </div>
                <span className="text-xs text-ink-muted">{r.category}</span>
                <span className="text-xs text-ink-muted">{r.content_type}</span>
                {(r.instrument || r.instrument_category) && (
                  <span className="text-xs text-ink-muted">{r.instrument || r.instrument_category}</span>
                )}
                <Badge tone={DIFF_TONE[r.difficulty] ?? 'neutral'}>{r.difficulty}</Badge>
                {r.template_id && <span className="text-xs font-medium text-brand-600">catálogo{r.customized ? ' (editado)' : ''}</span>}
                <div className="ml-auto flex items-center gap-2">
                  {r.file_path && fileUrls[r.file_path] && (
                    <a href={fileUrls[r.file_path]} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">Arquivo →</a>
                  )}
                  <LinkButton href={`/resources/${r.id}/edit`} variant="secondary" size="sm">Editar</LinkButton>
                  {r.template_id && (
                    <RestoreButton action={restoreResource} hidden={{ resourceId: r.id }} label="Restaurar" confirmText="Restaurar este recurso para a versão do catálogo? Suas edições serão perdidas." />
                  )}
                  <DeleteButton action={deleteResource} hidden={{ resourceId: r.id }} label="Excluir" confirmText={`Excluir o recurso "${r.title}"?`} />
                </div>
              </li>
            ))}
          </ul>
        </div>
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
