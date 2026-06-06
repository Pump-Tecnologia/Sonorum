import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { lessonStatus } from '@/lib/constants/lessons'
import { Card } from '@/components/ui/Card'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Minha agenda' }

export default async function StudentSchedulePage() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [upcomingRes, historyRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, title, start_datetime, end_datetime, status, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user!.id)
      .gte('start_datetime', now)
      .neq('status', 'canceled')
      .order('start_datetime')
      .limit(10),
    supabase
      .from('lessons')
      .select('id, title, start_datetime, status, users!lessons_teacher_id_fkey(name)')
      .eq('student_id', user!.id)
      .lt('start_datetime', now)
      .order('start_datetime', { ascending: false })
      .limit(20),
  ])

  type TeacherRow = { name: string }
  const upcoming = upcomingRes.data ?? []
  const history = historyRes.data ?? []

  return (
    <>
      <PageHeader title="Minha agenda" />

      <div className="space-y-8">
        {/* Próximas aulas */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-ink">Próximas aulas</h2>
          {upcoming.length === 0 ? (
            <Card><p className="text-sm text-ink-muted">Nenhuma aula agendada.</p></Card>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((l) => (
                <li key={l.id} className="rounded-2xl border border-hairline bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{l.title}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {new Date(l.start_datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo',
                          weekday: 'short', day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {(l.users as TeacherRow | null)?.name && ` · ${(l.users as TeacherRow).name}`}
                      </p>
                    </div>
                    <Badge tone="brand">Agendada</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Histórico */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-ink">Histórico</h2>
          <Table>
            <Thead>
              <Tr>
                <Th>Data</Th>
                <Th>Professor</Th>
                <Th>Status</Th>
                <Th className="text-right"></Th>
              </Tr>
            </Thead>
            <tbody>
              {history.length === 0 && <EmptyRow colSpan={4}>Nenhuma aula anterior.</EmptyRow>}
              {history.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <span className="font-medium">{l.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {new Date(l.start_datetime).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </Td>
                  <Td className="text-ink-muted">{(l.users as TeacherRow | null)?.name ?? '—'}</Td>
                  <Td>
                    <Badge tone={lessonStatus(l.status).tone}>{lessonStatus(l.status).label}</Badge>
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`/student/lessons/${l.id}`} variant="secondary" size="sm">Ver</LinkButton>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      </div>
    </>
  )
}
