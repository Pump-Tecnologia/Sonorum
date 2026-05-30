import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deleteResource } from '@/lib/actions/resources'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, title, description, category, difficulty, content_type, instrument, instrument_category, content_link')
    .order('created_at', { ascending: false })

  const list = resources ?? []

  return (
    <>
      <PageHeader
        title="Recursos pedagógicos"
        subtitle={`${list.length} recurso(s) na biblioteca`}
        action={
          <Link href="/resources/new">
            <Button>Novo recurso</Button>
          </Link>
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
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                <Link href={`/resources/${r.id}/edit`} className="text-xs font-semibold text-brand-600 hover:underline">
                  Editar
                </Link>
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
