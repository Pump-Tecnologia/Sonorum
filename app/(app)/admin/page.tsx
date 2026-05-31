import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { lessonStatus } from '@/lib/constants/lessons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { dayRange, formatBRL, monthRange } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

export default async function AdminDashboard() {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const plan = await getPlanContext()

  const today = dayRange()
  const month = monthRange()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  type TeacherRow = { id: string; name: string }
  type LessonForRetention = { student_id: string; status: string; users: { name: string } | null }
  type TodayLessonRow = { id: string; start_datetime: string; status: string; users: { name: string } | null }

  const [teachers, lessonsToday, charges, retentionLessons, teacherList, todayLessonsList] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end),
    plan.features.financial
      ? supabase.from('charges').select('amount').gte('due_date', month.start).lte('due_date', month.end)
      : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase
      .from('lessons')
      .select('student_id, status, users!lessons_student_id_fkey(name)')
      .eq('status', 'canceled')
      .gte('start_datetime', thirtyDaysAgo),
    supabase
      .from('users')
      .select('id, name')
      .eq('role', 'teacher')
      .order('name'),
    supabase
      .from('lessons')
      .select('id, start_datetime, status, users!lessons_student_id_fkey(name)')
      .gte('start_datetime', today.start)
      .lte('start_datetime', today.end)
      .order('start_datetime')
      .limit(5),
  ])

  const expectedRevenue = (charges.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const isFree = !plan.features.financial
  const studentLimitLabel = Number.isFinite(plan.features.studentLimit)
    ? `${plan.studentCount}/${plan.features.studentLimit}`
    : String(plan.studentCount)

  // Risco de retenção: top 5 alunos com mais aulas canceladas
  const retentionRaw = (retentionLessons.data ?? []) as unknown as LessonForRetention[]
  const retentionMap = new Map<string, { name: string; count: number }>()
  for (const l of retentionRaw) {
    const e = retentionMap.get(l.student_id) ?? { name: l.users?.name ?? '—', count: 0 }
    e.count++
    retentionMap.set(l.student_id, e)
  }
  const retentionRisk = [...retentionMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)

  // Aulas dadas no mês por professor (para status operacional)
  const { data: teacherLessonsMonth } = await supabase
    .from('lessons')
    .select('teacher_id, status')
    .gte('start_datetime', month.start + 'T00:00:00')
    .lte('start_datetime', month.end + 'T23:59:59')

  type TLRow = { teacher_id: string | null; status: string }
  const teacherStats = new Map<string, { completed: number; pending: number }>()
  for (const l of (teacherLessonsMonth ?? []) as TLRow[]) {
    if (!l.teacher_id) continue
    const e = teacherStats.get(l.teacher_id) ?? { completed: 0, pending: 0 }
    if (l.status === 'completed') e.completed++
    else if (l.status === 'scheduled') {
      // só conta como pendente as que já passaram (sem report)
      e.pending++
    }
    teacherStats.set(l.teacher_id, e)
  }

  const teachersList = (teacherList.data ?? []) as TeacherRow[]
  const teacherStatus = teachersList.map((t) => ({
    ...t,
    completed: teacherStats.get(t.id)?.completed ?? 0,
  }))

  const todayList = (todayLessonsList.data ?? []) as unknown as TodayLessonRow[]

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Bem-vindo, ${user?.name ?? ''}`} />

      {isFree && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50/50">
          <div>
            <p className="text-sm font-semibold text-ink">
              Plano {plan.features.label} · {studentLimitLabel} alunos
            </p>
            <p className="text-sm text-ink-muted">
              Faça upgrade para alunos ilimitados, financeiro e relatórios.
            </p>
          </div>
          <Link href="/upgrade"><Button>Fazer upgrade</Button></Link>
        </Card>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Alunos" value={studentLimitLabel} />
        <StatCard label="Professores" value={teachers.count ?? 0} />
        <StatCard label="Aulas hoje" value={lessonsToday.count ?? 0} />
        {plan.features.financial ? (
          <StatCard label="Receita prevista (mês)" value={formatBRL(expectedRevenue)} />
        ) : (
          <StatCard label="Receita prevista" value="—" hint="Disponível em planos pagos" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Aulas de hoje */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Aulas de hoje</h2>
            <Link href="/schedule" className="text-xs font-semibold text-brand-600 hover:underline">
              Ver agenda →
            </Link>
          </div>
          {todayList.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula hoje.</p>
          ) : (
            <ul className="space-y-2">
              {todayList.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{l.users?.name ?? '—'}</span>
                    <span className="ml-2 text-xs text-ink-muted">
                      {new Date(l.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Badge tone={lessonStatus(l.status).tone}>{lessonStatus(l.status).label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Risco de retenção */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Risco de retenção</h2>
          <p className="mb-3 text-xs text-ink-muted">Alunos com mais cancelamentos nos últimos 30 dias</p>
          {retentionRisk.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum cancelamento recente. 🎵</p>
          ) : (
            <ul className="space-y-2">
              {retentionRisk.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.name}</span>
                  <Badge tone={r.count >= 3 ? 'danger' : 'warning'}>{r.count} faltas</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Status dos professores */}
        <Card className="lg:col-span-3">
          <h2 className="mb-4 text-base font-semibold text-ink">Status dos professores (mês atual)</h2>
          {teacherStatus.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum professor cadastrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teacherStatus.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-hairline p-3 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-ink-muted">
                    <span className="font-semibold text-ink">{t.completed}</span> aulas realizadas
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
