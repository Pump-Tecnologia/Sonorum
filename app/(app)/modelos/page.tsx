import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deleteLessonPlanTemplate } from '@/lib/actions/lesson-templates'
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
    <>
      <PageHeader
        title="Modelos de aula"
        subtitle="Estruturas de planejamento reutilizáveis por instrumento"
        action={
          <Link href="/modelos/new">
            <Button>Novo modelo</Button>
          </Link>
        }
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Nenhum modelo ainda. Crie um aqui ou use “Salvar como modelo” dentro de uma aula para reaproveitar um planejamento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => {
            const sections = [
              t.warmup_note && 'Aquecimento',
              t.repertoire_note && 'Repertório',
              t.homework_note && 'Tarefa',
              t.target_bpm && 'BPM',
            ].filter(Boolean) as string[]
            return (
              <Card key={t.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-tight text-ink">{t.name}</p>
                  {(t.instrument || t.instrument_category) && (
                    <Badge tone="neutral">{t.instrument || t.instrument_category}</Badge>
                  )}
                </div>
                {t.goals && <p className="line-clamp-2 text-sm text-ink-muted">{t.goals}</p>}
                {sections.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs text-ink-muted">
                    {sections.map((s) => (
                      <span key={s} className="rounded-md bg-surface-muted px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                  <LinkButton href={`/modelos/${t.id}/edit`} variant="secondary" size="sm">Editar</LinkButton>
                  <DeleteButton
                    action={deleteLessonPlanTemplate}
                    hidden={{ templateId: t.id }}
                    label="Excluir"
                    confirmText={`Excluir o modelo "${t.name}"?`}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
