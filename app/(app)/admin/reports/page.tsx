import { redirect } from 'next/navigation'

import { ReportDateRange } from '@/components/admin/ReportDateRange'
import { LockedFeatureCard } from '@/components/billing/LockedFeatureCard'
import { DashHeader, DateBlock, Panel, StatTile } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { StatusPill } from '@/components/ds/StatusPill'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { sendLessonReport } from '@/lib/actions/notifications'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Relatórios' }

const decimal = (n: number) => n.toFixed(1).replace('.', ',')
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
      <div className={styles.page}>
        <DashHeader title="Relatórios de aula" />
        <LockedFeatureCard
          title="Relatórios de aula"
          description="Envie ao aluno o relatório de cada aula, com notas, música, BPM e observações, por e-mail e WhatsApp."
          benefits={['Relatório da aula com notas por pilar', 'Envio por e-mail e WhatsApp', 'Histórico de quem já recebeu']}
          planRequirement="Disponível a partir do plano Profissional"
        />
      </div>
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

  const avg = (r: ReportEmbed) => (r.technique_score + r.theory_score + r.repertoire_score + r.practice_score) / 4
  const sentCount = rows.filter((r) => sentSet.has(r.id)).length
  const uniqueStudents = new Set(rows.map((r) => r.student_id)).size
  const totalScoreSum = rows.reduce(
    (acc, r) => acc + (r.rep!.technique_score + r.rep!.theory_score + r.rep!.repertoire_score + r.rep!.practice_score) / 4,
    0,
  )
  const overallAvg = rows.length > 0 ? decimal(totalScoreSum / rows.length) : '—'

  return (
    <div className={styles.page}>
      <DashHeader
        title="Relatórios de aula"
        info="Acompanhe o desempenho das aulas e envie o relatório de cada uma ao aluno."
        actions={<ReportDateRange from={from} to={to} />}
      />

      <div className={styles.stats}>
        <StatTile label="Aulas avaliadas" value={rows.length} hint="Com relatório no período" />
        <StatTile
          label="Relatórios enviados"
          value={sentCount}
          hint={rows.length > 0 ? `${Math.round((sentCount / rows.length) * 100)}% das aulas avaliadas` : 'Nenhum envio'}
        />
        <StatTile label="Nota média" value={overallAvg !== '—' ? <>{overallAvg}<small>/5</small></> : '—'} hint="Técnica, teoria, repertório e dedicação" />
        <StatTile label="Alunos avaliados" value={uniqueStudents} />
      </div>

      <Panel id="reports-title" title="Aulas com relatório">
        {rows.length === 0 ? (
          <p className={styles.empty}>Nenhuma aula com relatório preenchido no período.</p>
        ) : (
          <ul className={styles.rows}>
            {rows.map((l) => {
              const score = avg(l.rep!)
              const sent = sentSet.has(l.id)
              return (
                <li key={l.id}>
                  <div className={styles.row}>
                    <DateBlock iso={l.start_datetime} />
                    <span className={styles.rowMain}>
                      <span className={styles.rowName}>{l.student?.name ?? 'Aluno'}</span>
                      <span className={styles.rowMeta}>{l.title}</span>
                    </span>
                    <span className={styles.rowEnd}>
                      <StatusPill tone={score >= 4 ? 'success' : 'neutral'}>Nota {decimal(score)}</StatusPill>
                      {sent && <StatusPill tone="brand">Enviado</StatusPill>}
                      <WhatsAppNotifyButton action={sendLessonReport} hidden={{ lessonId: l.id }} label={sent ? 'Reenviar' : 'Enviar'} />
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
