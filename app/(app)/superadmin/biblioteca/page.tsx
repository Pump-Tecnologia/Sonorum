import { PageHeader } from '@/components/app/PageHeader'
import { AppLinkButton } from '@/components/app/AppButton'
import { AppEmpty, AppTable, cellMuted, cellPrimary, cellSub, tableRight } from '@/components/app/AppTable'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { SubmitButton } from '@/components/ds/Button'
import { LinkButton } from '@/components/ui/Button'
import { deleteTemplate, provisionAllSchools } from '@/lib/actions/resource-templates'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Biblioteca global' }

interface TemplateRow {
  id: string; title: string; category: string | null; instrument: string | null
  instrument_category: string | null; difficulty: string | null; version: number; active: boolean
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('resource_templates')
    .select('id, title, category, instrument, instrument_category, difficulty, version, active')
    .order('instrument_category')
    .order('title')

  const templates = (data ?? []) as TemplateRow[]

  return (
    <>
      <PageHeader
        title="Biblioteca global"
        subtitle={templates.length === 1 ? '1 recurso no catálogo' : `${templates.length} recursos no catálogo`}
        info="Cada escola recebe uma cópia editável. Enviar para as escolas copia para cada escola os recursos do catálogo que ela ainda não tem."
        action={
          <div className="flex items-center gap-2">
            <form action={provisionAllSchools}>
              <SubmitButton variant="soft" pendingLabel="Enviando…">Enviar para as escolas</SubmitButton>
            </form>
            <AppLinkButton href="/superadmin/biblioteca/new">Novo recurso</AppLinkButton>
          </div>
        }
      />

      <AppTable>
        <thead>
          <tr>
            <th>Recurso</th>
            <th>Instrumento</th>
            <th>Dificuldade</th>
            <th>Versão</th>
            <th className={tableRight} />
          </tr>
        </thead>
        <tbody>
          {templates.length === 0 && <AppEmpty colSpan={5}>Nenhum recurso no catálogo.</AppEmpty>}
          {templates.map((t) => (
            <tr key={t.id}>
              <td>
                <span className={cellPrimary}>{t.title}</span>
                <span className={cellSub}>{t.category ?? 'Sem categoria'}{t.instrument_category ? ` de ${t.instrument_category}` : ''}</span>
              </td>
              <td className={cellMuted}>{t.instrument ?? 'Qualquer'}</td>
              <td className={cellMuted}>{t.difficulty ?? 'Livre'}</td>
              <td className={cellMuted}>v{t.version}</td>
              <td className={tableRight}>
                <div className="flex items-center justify-end gap-2">
                  <LinkButton href={`/superadmin/biblioteca/${t.id}/edit`} variant="secondary" size="sm">Editar</LinkButton>
                  <DeleteButton
                    action={deleteTemplate}
                    hidden={{ templateId: t.id }}
                    label="Excluir"
                    confirmText={`Excluir "${t.title}" do catálogo? As cópias já nas escolas permanecem (viram recursos próprios).`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </AppTable>
    </>
  )
}
