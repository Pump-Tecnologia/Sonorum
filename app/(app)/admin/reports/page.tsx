import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { effectiveChargeStatus } from '@/lib/finance'
import { formatBRL, monthRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Relatórios' }

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (user?.role !== 'admin' || !user.schoolId) redirect('/admin')
  const { features } = await getPlanContext()
  const supabase = await createClient()
  const month = monthRange()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Frequência (últimos 30 dias) — presença = realizada ou atrasada; falta = missed.
  // Canceladas ficam de fora da taxa (não são falta do aluno).
  const { data: lessonsRaw } = await supabase
    .from('lessons')
    .select('status, student_id, users!lessons_student_id_fkey(name)')
    .gte('start_datetime', thirtyDaysAgo)
    .in('status', ['completed', 'late', 'missed'])

  type LessonRow = { status: string; student_id: string; users: { name: string } | null }
  const lessons = (lessonsRaw ?? []) as unknown as LessonRow[]

  const attendanceMap = new Map<string, { name: string; attended: number; missed: number }>()
  for (const l of lessons) {
    const existing = attendanceMap.get(l.student_id) ?? { name: l.users?.name ?? '—', attended: 0, missed: 0 }
    if (l.status === 'completed' || l.status === 'late') existing.attended++
    else existing.missed++
    attendanceMap.set(l.student_id, existing)
  }
  const attendance = [...attendanceMap.values()]
    .map((a) => ({ ...a, total: a.attended + a.missed, rate: a.attended + a.missed > 0 ? Math.round((a.attended / (a.attended + a.missed)) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)

  // Financeiro (só se plano permite)
  let paid = 0, pending = 0, overdue = 0
  if (features.financial) {
    const { data: charges } = await supabase
      .from('charges')
      .select('status, amount, due_date')
      .gte('due_date', month.start)
      .lte('due_date', month.end)
    for (const c of charges ?? []) {
      const eff = effectiveChargeStatus(c.status, c.due_date, now)
      if (eff === 'paid') paid += Number(c.amount)
      else if (eff === 'overdue') overdue += Number(c.amount)
      else if (eff === 'pending') pending += Number(c.amount)
    }
  }

  // Repasse de professores (aulas realizadas no mês)
  const { data: teacherLessons } = await supabase
    .from('lessons')
    .select('teacher_id, users!lessons_teacher_id_fkey(name)')
    .eq('status', 'completed')
    .gte('start_datetime', month.start + 'T00:00:00')
    .lte('start_datetime', month.end + 'T23:59:59')

  type TLRow = { teacher_id: string | null; users: { name: string } | null }
  const payoutMap = new Map<string, { name: string; count: number }>()
  for (const l of (teacherLessons ?? []) as unknown as TLRow[]) {
    if (!l.teacher_id) continue
    const e = payoutMap.get(l.teacher_id) ?? { name: l.users?.name ?? '—', count: 0 }
    e.count++
    payoutMap.set(l.teacher_id, e)
  }
  const payouts = [...payoutMap.values()].sort((a, b) => b.count - a.count)

  return (
    <>
      <PageHeader title="Relatórios" />

      {/* Financeiro */}
      {features.financial ? (
        <section className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-ink">Financeiro — {new Date(month.start).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Pago" value={formatBRL(paid)} />
            <StatCard label="Pendente" value={formatBRL(pending)} />
            <StatCard label="Atrasado" value={formatBRL(overdue)} />
          </div>
        </section>
      ) : (
        <Card className="mb-8 border-dashed">
          <p className="text-sm text-ink-muted">Relatório financeiro disponível em planos pagos.</p>
        </Card>
      )}

      {/* Frequência */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-ink">Frequência — últimos 30 dias</h2>
        <Table>
          <Thead>
            <Tr>
              <Th>Aluno</Th>
              <Th>Presenças</Th>
              <Th>Faltas</Th>
              <Th>Taxa</Th>
            </Tr>
          </Thead>
          <tbody>
            {attendance.length === 0 && <EmptyRow colSpan={4}>Sem dados de frequência.</EmptyRow>}
            {attendance.map((a, i) => (
              <Tr key={i}>
                <Td className="font-medium">{a.name}</Td>
                <Td>{a.attended}</Td>
                <Td>{a.missed}</Td>
                <Td>
                  <Badge tone={a.rate >= 80 ? 'success' : a.rate >= 60 ? 'warning' : 'danger'}>
                    {a.rate}%
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* Repasse de professores */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink">Aulas por professor — mês atual</h2>
        <Table>
          <Thead>
            <Tr>
              <Th>Professor</Th>
              <Th className="text-right">Aulas realizadas</Th>
            </Tr>
          </Thead>
          <tbody>
            {payouts.length === 0 && <EmptyRow colSpan={2}>Sem aulas realizadas este mês.</EmptyRow>}
            {payouts.map((p, i) => (
              <Tr key={i}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="text-right font-semibold">{p.count}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>
    </>
  )
}
