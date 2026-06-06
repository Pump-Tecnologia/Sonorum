import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { lessonStatus } from '@/lib/constants/lessons'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { effectiveChargeStatus } from '@/lib/finance'
import { dayRange, monthRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

const INSTRUMENT_BAR = ['bg-brand-600', 'bg-accent-500', 'bg-brand-400', 'bg-accent-300', 'bg-brand-300', 'bg-ink-muted']

function pctTrend(current: number, previous: number): string | undefined {
  if (previous <= 0) return current > 0 ? 'novo este mês' : undefined
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return 'estável vs mês anterior'
  return `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs mês anterior`
}

export default async function AdminDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const plan = await getPlanContext()

  const today = dayRange()
  const month = monthRange()
  const now = new Date()
  const lastMonth = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayISO = now.toISOString().slice(0, 10)

  type TodayLessonRow = { id: string; start_datetime: string; status: string; users: { name: string } | null }
  type RetentionRow = { student_id: string; status: string; users: { name: string } | null }
  type ReportEmbed = { technique_score: number; theory_score: number; repertoire_score: number; practice_score: number }
  type TeacherLessonRow = {
    teacher_id: string | null; status: string; student_id: string; start_datetime: string
    student: { name: string } | null; teacher: { name: string } | null
    lesson_reports: ReportEmbed[] | ReportEmbed | null
  }

  const [
    teachersCount, lessonsToday, chargesMonth, chargesLast, retentionLessons,
    todayLessonsList, newStudentsMonth, newStudentsLast, studentsInstr,
    teacherList, teacherMonthLessons, unassigned,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('lessons').select('id', { count: 'exact', head: true }).gte('start_datetime', today.start).lte('start_datetime', today.end),
    plan.features.financial
      ? supabase.from('charges').select('amount, status, due_date').gte('due_date', month.start).lte('due_date', month.end)
      : Promise.resolve({ data: [] as { amount: number; status: string; due_date: string }[] }),
    plan.features.financial
      ? supabase.from('charges').select('amount').gte('due_date', lastMonth.start).lte('due_date', lastMonth.end)
      : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase.from('lessons').select('student_id, status, users!lessons_student_id_fkey(name)').eq('status', 'canceled').gte('start_datetime', thirtyDaysAgo),
    supabase.from('lessons').select('id, start_datetime, status, users!lessons_student_id_fkey(name)').gte('start_datetime', today.start).lte('start_datetime', today.end).order('start_datetime').limit(5),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', month.start).lte('created_at', month.end + 'T23:59:59'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', lastMonth.start).lte('created_at', lastMonth.end + 'T23:59:59'),
    supabase.from('users').select('instrument_category').eq('role', 'student'),
    supabase.from('users').select('id, name').eq('role', 'teacher').order('name'),
    supabase.from('lessons').select('teacher_id, status, student_id, start_datetime, student:users!lessons_student_id_fkey(name), teacher:users!lessons_teacher_id_fkey(name), lesson_reports(technique_score, theory_score, repertoire_score, practice_score)').gte('start_datetime', month.start + 'T00:00:00').lte('start_datetime', month.end + 'T23:59:59'),
    supabase.from('lessons').select('id', { count: 'exact', head: true }).is('teacher_id', null).gte('start_datetime', now.toISOString()).neq('status', 'canceled'),
  ])

  const expectedRevenue = (chargesMonth.data ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const lastRevenue = (chargesLast.data ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const newThisMonth = newStudentsMonth.count ?? 0
  const newLastMonth = newStudentsLast.count ?? 0

  const isFree = !plan.features.financial
  const studentLimitLabel = Number.isFinite(plan.features.studentLimit) ? `${plan.studentCount}/${plan.features.studentLimit}` : String(plan.studentCount)

  // Cobranças vencidas (status efetivo)
  const overdue = (chargesMonth.data ?? []).filter((c) => effectiveChargeStatus(c.status, c.due_date, now) === 'overdue')
  const overdueSum = overdue.reduce((s, c) => s + Number(c.amount), 0)

  // Risco de retenção
  const retentionMap = new Map<string, { id: string; name: string; count: number }>()
  for (const l of (retentionLessons.data ?? []) as unknown as RetentionRow[]) {
    const e = retentionMap.get(l.student_id) ?? { id: l.student_id, name: l.users?.name ?? '—', count: 0 }
    e.count++
    retentionMap.set(l.student_id, e)
  }
  const retentionRisk = [...retentionMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)

  // Alunos por instrumento
  const instrMap = new Map<string, number>()
  for (const s of (studentsInstr.data ?? []) as { instrument_category: string | null }[]) {
    const key = s.instrument_category || 'Não definido'
    instrMap.set(key, (instrMap.get(key) ?? 0) + 1)
  }
  const instruments = [...instrMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  const instrTotal = instruments.reduce((s, i) => s + i.count, 0)

  // Professores em destaque (aulas realizadas + média dos laudos + nº alunos)
  const tStats = new Map<string, { completed: number; students: Set<string>; scoreSum: number; scoreCount: number }>()
  for (const l of (teacherMonthLessons.data ?? []) as unknown as TeacherLessonRow[]) {
    if (!l.teacher_id) continue
    const e = tStats.get(l.teacher_id) ?? { completed: 0, students: new Set<string>(), scoreSum: 0, scoreCount: 0 }
    if (l.status === 'completed' || l.status === 'late') e.completed++
    if (l.student_id) e.students.add(l.student_id)
    const rep = Array.isArray(l.lesson_reports) ? l.lesson_reports[0] : l.lesson_reports
    if (rep) {
      e.scoreSum += (rep.technique_score + rep.theory_score + rep.repertoire_score + rep.practice_score) / 4
      e.scoreCount++
    }
    tStats.set(l.teacher_id, e)
  }
  const teachers = ((teacherList.data ?? []) as { id: string; name: string }[]).map((t) => {
    const s = tStats.get(t.id)
    return {
      id: t.id, name: t.name,
      completed: s?.completed ?? 0,
      students: s?.students.size ?? 0,
      avg: s && s.scoreCount > 0 ? (s.scoreSum / s.scoreCount).toFixed(1) : null,
    }
  }).sort((a, b) => b.completed - a.completed).slice(0, 5)

  // Operacional do mês (frequência por aluno, produtividade e presenças
  // pendentes) — derivado das mesmas aulas do mês.
  const nowIso = now.toISOString()
  const attMap = new Map<string, { id: string; name: string; attended: number; missed: number }>()
  const prodMap = new Map<string, { name: string; done: number; missed: number; toMark: number }>()
  const pendingByTeacher = new Map<string, { name: string; count: number }>()
  let pendingTotal = 0
  for (const l of (teacherMonthLessons.data ?? []) as unknown as TeacherLessonRow[]) {
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
      prodMap.set(l.teacher_id, p)
    }
  }
  const attendance = [...attMap.values()]
    .map((a) => ({ ...a, rate: a.attended + a.missed > 0 ? Math.round((a.attended / (a.attended + a.missed)) * 100) : 0 }))
    .sort((a, b) => a.rate - b.rate)
  const productivity = [...prodMap.values()]
    .map((p) => ({ ...p, doneRate: p.done + p.missed > 0 ? Math.round((p.done / (p.done + p.missed)) * 100) : 0 }))
    .sort((a, b) => b.done - a.done)
  const pendings = [...pendingByTeacher.values()].sort((a, b) => b.count - a.count)

  // Atenção necessária — sinais reais e acionáveis
  type Alert = { label: string; detail: React.ReactNode; href: string; tone: 'danger' | 'warning' }
  const alerts: Alert[] = []
  if (plan.features.financial && overdue.length > 0)
    alerts.push({ label: `${overdue.length} cobrança(s) vencida(s)`, detail: <><MoneyValue value={overdueSum} /> em atraso</>, href: '/financial', tone: 'danger' })
  if ((unassigned.count ?? 0) > 0)
    alerts.push({ label: `${unassigned.count} aula(s) sem professor`, detail: 'Atribua um professor na agenda', href: '/schedule', tone: 'warning' })
  if (pendingTotal > 0)
    alerts.push({ label: `${pendingTotal} presença(s) pendente(s)`, detail: 'Aulas já passaram sem presença lançada', href: '/schedule', tone: 'warning' })
  for (const r of retentionRisk.filter((r) => r.count >= 3))
    alerts.push({ label: `${r.name} faltou ${r.count}×`, detail: 'Risco de evasão', href: `/admin/students/${r.id}`, tone: 'danger' })

  const todayList = (todayLessonsList.data ?? []) as unknown as TodayLessonRow[]
  const datePill = `Hoje: ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo, ${user?.name ?? ''}`}
        action={
          <div className="flex items-center gap-2">
            {plan.features.financial && <FinanceToggle />}
            <span className="hidden items-center rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink-muted sm:inline-flex">{datePill}</span>
            <Link href="/admin/students/new"><Button>Novo aluno</Button></Link>
          </div>
        }
      />

      {isFree && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50/50">
          <div>
            <p className="text-sm font-semibold text-ink">Plano {plan.features.label} · {studentLimitLabel} alunos</p>
            <p className="text-sm text-ink-muted">Faça upgrade para alunos ilimitados, financeiro e relatórios.</p>
          </div>
          <Link href="/upgrade"><Button>Fazer upgrade</Button></Link>
        </Card>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/students"><StatCard label="Alunos" value={studentLimitLabel} hint={pctTrend(newThisMonth, newLastMonth) ?? `${newThisMonth} novo(s) este mês`} /></Link>
        <Link href="/admin/teachers"><StatCard label="Professores" value={teachersCount.count ?? 0} /></Link>
        <Link href="/schedule"><StatCard label="Aulas hoje" value={lessonsToday.count ?? 0} /></Link>
        {plan.features.financial ? (
          <Link href="/financial"><StatCard label="Receita prevista (mês)" value={<MoneyValue value={expectedRevenue} />} hint={pctTrend(expectedRevenue, lastRevenue)} /></Link>
        ) : (
          <StatCard label="Receita prevista" value="—" hint="Disponível em planos pagos" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Atenção necessária */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Atenção necessária</h2>
            {alerts.length > 0 && <Badge tone="danger">{alerts.length}</Badge>}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-ink-muted">Tudo em dia por aqui. 🎵</p>
          ) : (
            <ul className="space-y-1.5">
              {alerts.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-start gap-2.5 rounded-xl border border-hairline px-3 py-2.5 transition-colors hover:bg-surface-muted">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === 'danger' ? 'bg-red-500' : 'bg-amber-400'}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{a.label}</p>
                      <p className="text-xs text-ink-muted">{a.detail}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Aulas de hoje */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Aulas de hoje</h2>
            <LinkButton href="/schedule" variant="ghost" size="sm">Ver agenda →</LinkButton>
          </div>
          {todayList.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula hoje.</p>
          ) : (
            <ul className="space-y-2">
              {todayList.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{l.users?.name ?? '—'}</span>
                    <span className="ml-2 text-xs text-ink-muted">{new Date(l.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <Badge tone={lessonStatus(l.status).tone}>{lessonStatus(l.status).label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Alunos por instrumento */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Alunos por instrumento</h2>
          {instruments.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum aluno cadastrado.</p>
          ) : (
            <ul className="space-y-3">
              {instruments.map((inst, i) => (
                <li key={inst.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink">{inst.label}</span>
                    <span className="font-semibold text-ink">{inst.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full rounded-full ${INSTRUMENT_BAR[i % INSTRUMENT_BAR.length]}`} style={{ width: `${instrTotal ? (inst.count / instrTotal) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Professores em destaque */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Professores em destaque (mês)</h2>
            <LinkButton href="/admin/teachers" variant="ghost" size="sm">Ver todos →</LinkButton>
          </div>
          {teachers.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum professor cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {teachers.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{t.name}</span>
                  <div className="flex items-center gap-4 text-ink-muted">
                    <span><span className="font-semibold text-ink">{t.completed}</span> aulas</span>
                    <span><span className="font-semibold text-ink">{t.students}</span> alunos</span>
                    {t.avg && <Badge tone={Number(t.avg) >= 4 ? 'success' : 'neutral'}>★ {t.avg}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Risco de retenção */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Risco de retenção</h2>
          <p className="mb-3 text-xs text-ink-muted">Mais cancelamentos nos últimos 30 dias</p>
          {retentionRisk.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum cancelamento recente. 🎵</p>
          ) : (
            <ul className="space-y-2">
              {retentionRisk.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/students/${r.id}`} className="font-medium text-ink hover:text-brand-600">{r.name}</Link>
                  <Badge tone={r.count >= 3 ? 'danger' : 'warning'}>{r.count} faltas</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Operação do mês ───────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Frequência por aluno */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Frequência <span className="text-sm font-normal text-ink-muted">(mês)</span></h2>
          <Table>
            <Thead>
              <Tr><Th>Aluno</Th><Th>Presenças</Th><Th>Faltas</Th><Th>Taxa</Th></Tr>
            </Thead>
            <tbody>
              {attendance.length === 0 && <EmptyRow colSpan={4}>Sem presenças registradas no mês.</EmptyRow>}
              {attendance.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium">
                    <Link href={`/admin/students/${a.id}`} className="text-brand-700 hover:underline">{a.name}</Link>
                  </Td>
                  <Td>{a.attended}</Td>
                  <Td>{a.missed}</Td>
                  <Td><Badge tone={a.rate >= 80 ? 'success' : a.rate >= 60 ? 'warning' : 'danger'}>{a.rate}%</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Produtividade dos professores */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Produtividade <span className="text-sm font-normal text-ink-muted">(professores, mês)</span></h2>
          <Table>
            <Thead>
              <Tr><Th>Professor</Th><Th>Realizadas</Th><Th>Faltas</Th><Th>A lançar</Th><Th>Conclusão</Th></Tr>
            </Thead>
            <tbody>
              {productivity.length === 0 && <EmptyRow colSpan={5}>Sem aulas no mês.</EmptyRow>}
              {productivity.map((p, i) => (
                <Tr key={i}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td className="font-semibold">{p.done}</Td>
                  <Td>{p.missed}</Td>
                  <Td>{p.toMark}</Td>
                  <Td><Badge tone={p.doneRate >= 80 ? 'success' : p.doneRate >= 50 ? 'warning' : 'neutral'}>{p.doneRate}%</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Presenças pendentes */}
        {pendingTotal > 0 && (
          <Card className="lg:col-span-2">
            <h2 className="mb-1 text-base font-semibold text-ink">Presenças pendentes</h2>
            <p className="mb-4 text-sm text-ink-muted">
              {pendingTotal} aula(s) já passaram e seguem como “Agendada” — a presença não foi lançada.
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
          </Card>
        )}
      </div>
    </>
  )
}
