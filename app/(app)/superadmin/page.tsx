import Link from 'next/link'

import { AppBadge } from '@/components/app/AppBadge'
import { AppLinkButton } from '@/components/app/AppButton'
import { AppEmpty, AppTable, cellMuted, cellPrimary, cellSub, tableRight } from '@/components/app/AppTable'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { PageHeader } from '@/components/app/PageHeader'
import { Card } from '@/components/ui/Card'
import { Sparkline } from '@/components/ui/Sparkline'
import { StatCard } from '@/components/ui/StatCard'
import { formatBRL, monthRange } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Visão geral da rede' }

const PLAN_LABEL: Record<string, string> = {
  free: 'Essencial', basic: 'Básico', professional: 'Profissional', premium: 'Premium',
}

function relTime(iso: string, now: Date): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `há ${Math.max(1, mins)} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.round(hours / 24)
  return `há ${days}d`
}

interface SchoolRow {
  id: string; name: string; custom_name: string | null; plan_type: string
  monthly_price: number | null; expiration_date: string | null; created_at: string
  users: { id: string; name: string; role: string }[]
}

export default async function SuperAdminDashboard() {
  const admin = await createAdminClient()
  const now = new Date()
  const month = monthRange(now)
  const todayISO = now.toISOString().slice(0, 10)

  const [schoolsRes, studentsRes, chargesRes, lessonsMonth] = await Promise.all([
    admin.from('schools').select('id, name, custom_name, plan_type, monthly_price, expiration_date, created_at, users!inner(id, name, role)').eq('users.role', 'admin').order('created_at', { ascending: false }),
    admin.from('users').select('id, name, school_id, created_at').eq('role', 'student'),
    admin.from('charges').select('school_id, amount, due_date'),
    admin.from('lessons').select('id', { count: 'exact', head: true }).gte('start_datetime', month.start + 'T00:00:00').lte('start_datetime', month.end + 'T23:59:59'),
  ])

  const schools = (schoolsRes.data ?? []) as unknown as SchoolRow[]
  const students = (studentsRes.data ?? []) as { id: string; name: string; school_id: string | null; created_at: string }[]
  const charges = (chargesRes.data ?? []) as { school_id: string | null; amount: number; due_date: string }[]

  // KPIs da rede
  const totalSchools = schools.length
  const newSchools = schools.filter((s) => s.created_at.slice(0, 10) >= month.start).length
  const totalStudents = students.length
  const newStudents = students.filter((s) => s.created_at.slice(0, 10) >= month.start).length
  const revenueMonth = charges.filter((c) => c.due_date >= month.start && c.due_date <= month.end).reduce((s, c) => s + Number(c.amount), 0)

  // Alunos e faturamento por escola
  const studentsBySchool = new Map<string, number>()
  for (const s of students) if (s.school_id) studentsBySchool.set(s.school_id, (studentsBySchool.get(s.school_id) ?? 0) + 1)
  const revenueBySchool = new Map<string, number>()
  for (const c of charges) if (c.school_id && c.due_date >= month.start && c.due_date <= month.end) revenueBySchool.set(c.school_id, (revenueBySchool.get(c.school_id) ?? 0) + Number(c.amount))

  // Série de receita consolidada — últimos 6 meses
  const series: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const value = charges.filter((c) => c.due_date.startsWith(key)).reduce((s, c) => s + Number(c.amount), 0)
    series.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }), value })
  }

  // Ranking de unidades
  const ranking = schools
    .map((s) => ({
      ...s,
      alunos: studentsBySchool.get(s.id) ?? 0,
      faturamento: revenueBySchool.get(s.id) ?? 0,
      ativa: !s.expiration_date || s.expiration_date >= todayISO,
    }))
    .sort((a, b) => b.alunos - a.alunos)

  // Atividade global — eventos reais (escolas e alunos criados)
  type Activity = { id: string; label: string; sub: string; at: string; tone: 'brand' | 'success' }
  const schoolName = (id: string | null) => schools.find((s) => s.id === id)?.custom_name || schools.find((s) => s.id === id)?.name || '—'
  const activity: Activity[] = [
    ...schools.map((s) => ({ id: `sc-${s.id}`, label: 'Nova escola na rede', sub: s.custom_name || s.name, at: s.created_at, tone: 'brand' as const })),
    ...students.map((s) => ({ id: `st-${s.id}`, label: 'Novo aluno matriculado', sub: `${s.name} · ${schoolName(s.school_id)}`, at: s.created_at, tone: 'success' as const })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6)

  return (
    <>
      <PageHeader
        title="Visão geral da rede"
        subtitle={`Monitoramento de ${totalSchools} unidade(s) Sonorum`}
        action={<AppLinkButton href="/superadmin/schools/new">Nova escola</AppLinkButton>}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unidades" value={totalSchools} hint={newSchools > 0 ? `+${newSchools} nova(s) este mês` : undefined} />
        <StatCard label="Alunos na rede" value={totalStudents} hint={newStudents > 0 ? `+${newStudents} este mês` : undefined} />
        <StatCard label="Receita da rede (mês)" value={formatBRL(revenueMonth)} />
        <StatCard label="Aulas na rede (mês)" value={lessonsMonth.count ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Receita consolidada */}
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-base font-semibold text-ink">Receita consolidada</h2>
          <p className="mb-4 text-xs text-ink-muted">Últimos 6 meses · {formatBRL(series.reduce((s, m) => s + m.value, 0))} no período</p>
          {series.every((m) => m.value === 0) ? (
            <p className="py-8 text-center text-sm text-ink-muted">Sem receita registrada ainda na rede.</p>
          ) : (
            <>
              <div className="text-brand-600">
                <Sparkline values={series.map((m) => m.value)} width={560} height={120} className="w-full" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-muted">
                {series.map((m) => <span key={m.label} className="capitalize">{m.label}</span>)}
              </div>
            </>
          )}
        </Card>

        {/* Atividade global */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Atividade global</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma atividade ainda.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === 'success' ? 'bg-accent-500' : 'bg-brand-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.label}</p>
                    <p className="truncate text-xs text-ink-muted">{a.sub}</p>
                    <p className="text-xs text-ink-muted/70">{relTime(a.at, now)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Ranking de unidades */}
      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Ranking de unidades</h2>
          <Link href="/superadmin/schools/new" className="text-xs font-semibold text-brand-600 hover:underline">Nova escola →</Link>
        </div>
        <AppTable>
          <thead>
            <tr>
              <th>Escola</th>
              <th>Plano</th>
              <th>Alunos</th>
              <th>Faturamento (mês)</th>
              <th>Status</th>
              <th className={tableRight} />
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && <AppEmpty colSpan={6}>Nenhuma escola ainda.</AppEmpty>}
            {ranking.map((s) => {
              const adminUser = s.users?.[0]
              return (
                <tr key={s.id}>
                  <td>
                    <span className={cellPrimary}>{s.custom_name || s.name}</span>
                    {adminUser && <span className={cellSub}>Admin: {adminUser.name}</span>}
                  </td>
                  <td><AppBadge tone={s.plan_type === 'free' ? 'neutral' : 'brand'}>{PLAN_LABEL[s.plan_type] ?? s.plan_type}</AppBadge></td>
                  <td className={cellMuted}>{s.alunos}</td>
                  <td className={cellMuted}>{formatBRL(s.faturamento)}</td>
                  <td><AppBadge tone={s.ativa ? 'success' : 'danger'}>{s.ativa ? 'Ativa' : 'Expirada'}</AppBadge></td>
                  <td className={tableRight}>
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/superadmin/schools/${s.id}/edit`} className="text-xs font-semibold text-brand-600 hover:underline">
                        Editar
                      </Link>
                      {adminUser && <ImpersonateButton targetUserId={adminUser.id} label="Entrar como admin" />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </AppTable>
      </section>
    </>
  )
}
