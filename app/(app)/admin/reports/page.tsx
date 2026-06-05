import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ReportDateRange } from '@/components/admin/ReportDateRange'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { sendLessonReport } from '@/lib/actions/notifications'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Relatórios' }

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

type ReportEmbed = { technique_score: number; theory_score: number; repertoire_score: number; practice_score: number }

// Relatórios de aula: lista as aulas com relatório preenchido no período e
// permite enviar/reenviar ao aluno (e-mail/WhatsApp). Não é dashboard de números.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const user = await getCurrentUser()
  if (user?.role !== 'admin' || !user.schoolId) redirect('/admin')
  const schoolId = user.schoolId
  const { features } = await getPlanContext()

  const today = new Date()
  const sp = await searchParams
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  const from = sp.from && isoDate.test(sp.from) ? sp.from : `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
  const to = sp.to && isoDate.test(sp.to) ? sp.to : ymd(today)
  const fromTs = `${from}T00:00:00-03:00`
  const toTs = `${to}T23:59:59.999-03:00`

  if (!features.reports) {
    return (
      <>
        <PageHeader title="Relatórios de aula" subtitle="Envie o relatório da aula ao aluno" />
        <Card className="border-dashed">
          <p className="text-sm font-medium text-ink">Disponível nos planos pagos</p>
          <p className="mt-1 text-sm text-ink-muted">
            Envie automaticamente o relatório de cada aula (notas, música, BPM e observações) ao aluno por
            e-mail/WhatsApp a partir do plano Profissional.
          </p>
        </Card>
      </>
    )
  }

  const db = await createClient()
  const { data: lessonsRaw } = await db
    .from('lessons')
    .select('id, title, start_datetime, student_id, student:users!lessons_student_id_fkey(name), report:lesson_reports(technique_score, theory_score, repertoire_score, practice_score)')
    .eq('school_id', schoolId)
    .gte('start_datetime', fromTs)
    .lte('start_datetime', toTs)
    .order('start_datetime', { ascending: false })

  type LessonRow = {
    id: string; title: string; start_datetime: string; student_id: string
    student: { name: string } | null
    report: ReportEmbed[] | ReportEmbed | null
  }
  // Só aulas COM relatório preenchido.
  const rows = ((lessonsRaw ?? []) as unknown as LessonRow[])
    .map((l) => ({ ...l, rep: (Array.isArray(l.report) ? l.report[0] : l.report) ?? null }))
    .filter((l) => l.rep != null)

  // Marca quais já foram enviados (log de notificação).
  const sentSet = new Set<string>()
  if (rows.length > 0) {
    const { data: sent } = await db
      .from('notifications')
      .select('related_id')
      .eq('school_id', schoolId)
      .eq('event', 'lesson.report')
      .in('related_id', rows.map((r) => r.id))
    for (const s of (sent ?? []) as { related_id: string | null }[]) {
      if (s.related_id) sentSet.add(s.related_id)
    }
  }

  const avg = (r: ReportEmbed) => ((r.technique_score + r.theory_score + r.repertoire_score + r.practice_score) / 4).toFixed(1)

  return (
    <>
      <PageHeader
        title="Relatórios de aula"
        subtitle="Envie o relatório de cada aula ao aluno"
        action={<ReportDateRange from={from} to={to} />}
      />

      <Table>
        <Thead>
          <Tr>
            <Th>Aluno</Th>
            <Th>Aula</Th>
            <Th>Data</Th>
            <Th>Avaliação</Th>
            <Th className="text-right">Enviar</Th>
          </Tr>
        </Thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow colSpan={5}>Nenhuma aula com relatório preenchido no período.</EmptyRow>
          )}
          {rows.map((l) => (
            <Tr key={l.id}>
              <Td className="font-medium">{l.student?.name ?? '—'}</Td>
              <Td className="text-ink-muted">{l.title}</Td>
              <Td className="text-ink-muted">{new Date(l.start_datetime).toLocaleDateString('pt-BR')}</Td>
              <Td>
                <Badge tone={Number(avg(l.rep!)) >= 4 ? 'success' : 'neutral'}>★ {avg(l.rep!)}</Badge>
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {sentSet.has(l.id) && <span className="text-xs font-medium text-accent-700">enviado</span>}
                  <WhatsAppNotifyButton
                    action={sendLessonReport}
                    hidden={{ lessonId: l.id }}
                    label={sentSet.has(l.id) ? 'Reenviar' : 'Enviar'}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
