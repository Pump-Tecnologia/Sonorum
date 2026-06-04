import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { ReportDateRange } from '@/components/admin/ReportDateRange'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { effectiveChargeStatus } from '@/lib/finance'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Relatórios' }

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const user = await getCurrentUser()
  if (user?.role !== 'admin' || !user.schoolId) redirect('/admin')
  const { features } = await getPlanContext()
  const supabase = await createClient()

  const today = new Date()
  const sp = await searchParams
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  const from = sp.from && isoDate.test(sp.from) ? sp.from : `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
  const to = sp.to && isoDate.test(sp.to) ? sp.to : ymd(today)
  // Offset BRT (-03:00) pra que aulas à noite (UTC do dia seguinte) entrem no dia certo.
  const fromTs = `${from}T00:00:00-03:00`
  const toTs = `${to}T23:59:59.999-03:00`
  const nowIso = today.toISOString()

  // ── Aulas do período (uma busca alimenta frequência, pendentes e produtividade)
  const { data: lessonsRaw } = await supabase
    .from('lessons')
    .select('status, student_id, teacher_id, start_datetime, student:users!lessons_student_id_fkey(name), teacher:users!lessons_teacher_id_fkey(name)')
    .eq('school_id', user.schoolId)
    .gte('start_datetime', fromTs)
    .lte('start_datetime', toTs)

  type LessonRow = {
    status: string; student_id: string; teacher_id: string | null; start_datetime: string
    student: { name: string } | null; teacher: { name: string } | null
  }
  const lessons = (lessonsRaw ?? []) as unknown as LessonRow[]

  // Frequência por aluno (presença = realizada/atrasada; falta = missed)
  const attMap = new Map<string, { id: string; name: string; attended: number; missed: number }>()
  // Presenças pendentes: aula passada ainda "Agendada" (presença não lançada)
  const pendingByTeacher = new Map<string, { name: string; count: number }>()
  let pendingTotal = 0
  // Produtividade por professor (toMark = aulas passadas ainda não lançadas;
  // aulas futuras ficam de fora da taxa de conclusão).
  const prodMap = new Map<string, { name: string; done: number; missed: number; toMark: number }>()

  for (const l of lessons) {
    if (l.status === 'completed' || l.status === 'late' || l.status === 'missed') {
      const a = attMap.get(l.student_id) ?? { id: l.student_id, name: l.student?.name ?? '—', attended: 0, missed: 0 }
      if (l.status === 'missed') a.missed++
      else a.attended++
      attMap.set(l.student_id, a)
    }
    if (l.status === 'scheduled' && l.start_datetime < nowIso) {
      pendingTotal++
      const key = l.teacher_id ?? 'sem'
      const t = pendingByTeacher.get(key) ?? { name: l.teacher?.name ?? 'Sem professor', count: 0 }
      t.count++
      pendingByTeacher.set(key, t)
    }
    if (l.teacher_id && l.status !== 'canceled') {
      const p = prodMap.get(l.teacher_id) ?? { name: l.teacher?.name ?? '—', done: 0, missed: 0, toMark: 0 }
      if (l.status === 'completed' || l.status === 'late') p.done++
      else if (l.status === 'missed') p.missed++
      else if (l.status === 'scheduled' && l.start_datetime < nowIso) p.toMark++
      // aulas futuras agendadas não entram na produtividade (ainda não ocorreram)
      prodMap.set(l.teacher_id, p)
    }
  }

  const attendance = [...attMap.values()]
    .map((a) => ({ ...a, total: a.attended + a.missed, rate: a.attended + a.missed > 0 ? Math.round((a.attended / (a.attended + a.missed)) * 100) : 0 }))
    .sort((a, b) => a.rate - b.rate) // piores primeiro (mais acionável)
  const pendings = [...pendingByTeacher.values()].sort((a, b) => b.count - a.count)
  const productivity = [...prodMap.values()]
    .map((p) => {
      // Taxa de presença das aulas já lançadas (não pune o professor por atraso
      // de lançamento — as pendentes ficam na coluna 'A lançar').
      const decided = p.done + p.missed
      return { ...p, doneRate: decided > 0 ? Math.round((p.done / decided) * 100) : 0 }
    })
    .sort((a, b) => b.done - a.done)

  // ── Financeiro (gated): receita + inadimplentes ─────────────────────────────
  let paid = 0, pending = 0, overdue = 0
  type Debtor = { id: string; name: string; total: number; oldest: string; count: number }
  const debtorsMap = new Map<string, Debtor>()
  if (features.financial) {
    const { data: charges } = await supabase
      .from('charges')
      .select('status, amount, paid_amount, due_date, enrollment:enrollments(student_id, student:users(name))')
      .eq('school_id', user.schoolId)
      .gte('due_date', from)
      .lte('due_date', to)
    type ChargeRow = {
      status: string; amount: number; paid_amount: number | null; due_date: string
      enrollment: { student_id: string; student: { name: string } | null } | null
    }
    for (const c of (charges ?? []) as unknown as ChargeRow[]) {
      const eff = effectiveChargeStatus(c.status, c.due_date, today)
      if (eff === 'paid') paid += c.paid_amount != null ? Number(c.paid_amount) : Number(c.amount)
      else if (eff === 'overdue') {
        overdue += Number(c.amount)
        const enr = c.enrollment
        if (enr) {
          const d = debtorsMap.get(enr.student_id) ?? { id: enr.student_id, name: enr.student?.name ?? '—', total: 0, oldest: c.due_date, count: 0 }
          d.total += Number(c.amount)
          d.count++
          if (c.due_date < d.oldest) d.oldest = c.due_date
          debtorsMap.set(enr.student_id, d)
        }
      } else if (eff === 'pending') pending += Number(c.amount)
    }
  }
  const debtors = [...debtorsMap.values()].sort((a, b) => b.total - a.total)

  // ── Crescimento de alunos ───────────────────────────────────────────────────
  const { data: studentsRaw } = await supabase
    .from('users')
    .select('id, status, created_at')
    .eq('role', 'student')
    .eq('school_id', user.schoolId)
  type StudentRow = { id: string; status: string; created_at: string }
  const students = (studentsRaw ?? []) as StudentRow[]
  // Comparação por timestamp (não string) — created_at e o range têm offsets diferentes.
  const fromMs = new Date(fromTs).getTime()
  const toMs = new Date(toTs).getTime()
  const newStudents = students.filter((s) => {
    const t = new Date(s.created_at).getTime()
    return t >= fromMs && t <= toMs
  }).length
  const byStatus = { active: 0, paused: 0, inactive: 0 } as Record<string, number>
  for (const s of students) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1

  const { count: churn } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', user.schoolId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', fromTs)
    .lte('cancelled_at', toTs)

  const rangeLabel = `${new Date(from + 'T12:00:00').toLocaleDateString('pt-BR')} – ${new Date(to + 'T12:00:00').toLocaleDateString('pt-BR')} (${daysBetween(from, to)} dias)`

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={rangeLabel}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {features.financial && <FinanceToggle />}
            <ReportDateRange from={from} to={to} />
          </div>
        }
      />

      {/* Financeiro */}
      {features.financial ? (
        <section className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-ink">Financeiro</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Recebido" value={<MoneyValue value={paid} />} />
            <StatCard label="A receber" value={<MoneyValue value={pending} />} />
            <StatCard label="Em atraso" value={<MoneyValue value={overdue} />} hint={`${debtors.length} aluno(s)`} />
          </div>

          <h3 className="mb-2 text-sm font-semibold text-ink">Inadimplentes</h3>
          <Table>
            <Thead>
              <Tr><Th>Aluno</Th><Th>Cobranças</Th><Th>Vencida mais antiga</Th><Th className="text-right">Total devido</Th></Tr>
            </Thead>
            <tbody>
              {debtors.length === 0 && <EmptyRow colSpan={4}>Nenhum aluno em atraso no período. 🎉</EmptyRow>}
              {debtors.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium">
                    <Link href={`/admin/students/${d.id}`} className="text-brand-700 hover:underline">{d.name}</Link>
                  </Td>
                  <Td>{d.count}</Td>
                  <Td className="text-ink-muted">{new Date(d.oldest + 'T12:00:00').toLocaleDateString('pt-BR')}</Td>
                  <Td className="text-right font-semibold text-red-600"><MoneyValue value={d.total} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      ) : (
        <Card className="mb-8 border-dashed">
          <p className="text-sm text-ink-muted">Relatório financeiro disponível em planos pagos.</p>
        </Card>
      )}

      {/* Crescimento */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-ink">Crescimento de alunos</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Novos no período" value={String(newStudents)} />
          <StatCard label="Ativos" value={String(byStatus.active ?? 0)} hint="situação atual" />
          <StatCard label="Pausados" value={String(byStatus.paused ?? 0)} hint="situação atual" />
          <StatCard label="Matrículas canceladas" value={String(churn ?? 0)} hint="no período" />
        </div>
      </section>

      {/* Presenças pendentes */}
      {pendingTotal > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-base font-semibold text-ink">Presenças pendentes</h2>
          <p className="mb-4 text-sm text-ink-muted">
            {pendingTotal} aula(s) já passaram e seguem como “Agendada” — a presença não foi registrada.
          </p>
          <Table>
            <Thead>
              <Tr><Th>Professor</Th><Th className="text-right">Aulas a lançar</Th></Tr>
            </Thead>
            <tbody>
              {pendings.map((p, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td className="text-right font-semibold text-amber-600">{p.count}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      {/* Frequência */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-ink">Frequência</h2>
        <Table>
          <Thead>
            <Tr><Th>Aluno</Th><Th>Presenças</Th><Th>Faltas</Th><Th>Taxa</Th></Tr>
          </Thead>
          <tbody>
            {attendance.length === 0 && <EmptyRow colSpan={4}>Sem presenças registradas no período.</EmptyRow>}
            {attendance.map((a) => (
              <Tr key={a.id}>
                <Td className="font-medium">
                  <Link href={`/admin/students/${a.id}`} className="text-brand-700 hover:underline">{a.name}</Link>
                </Td>
                <Td>{a.attended}</Td>
                <Td>{a.missed}</Td>
                <Td>
                  <Badge tone={a.rate >= 80 ? 'success' : a.rate >= 60 ? 'warning' : 'danger'}>{a.rate}%</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* Produtividade dos professores */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-ink">Produtividade dos professores</h2>
        <Table>
          <Thead>
            <Tr><Th>Professor</Th><Th>Realizadas</Th><Th>Faltas</Th><Th>A lançar</Th><Th>Conclusão</Th></Tr>
          </Thead>
          <tbody>
            {productivity.length === 0 && <EmptyRow colSpan={5}>Sem aulas no período.</EmptyRow>}
            {productivity.map((p, i) => (
              <Tr key={i}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="font-semibold">{p.done}</Td>
                <Td>{p.missed}</Td>
                <Td>{p.toMark}</Td>
                <Td>
                  <Badge tone={p.doneRate >= 80 ? 'success' : p.doneRate >= 50 ? 'warning' : 'neutral'}>{p.doneRate}%</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>
    </>
  )
}
