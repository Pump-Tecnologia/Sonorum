import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { DashHeader, Panel, StatTile } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { LinkButton } from '@/components/ds/Button'
import { IconPlus } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { Sparkline } from '@/components/ui/Sparkline'
import { monthRange } from '@/lib/format'
import { dateInBR } from '@/lib/timezone'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Visão geral da rede' }

const PLAN_LABEL: Record<string, string> = {
  free: 'Essencial', basic: 'Básico', solo_free: 'Solo Essencial', solo: 'Solo', solo_pro: 'Solo Pro', professional: 'Profissional', premium: 'Premium', enterprise: 'Sob medida',
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
  const todayISO = dateInBR(now)

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
    ...students.map((s) => ({ id: `st-${s.id}`, label: 'Novo aluno matriculado', sub: `${s.name} na escola ${schoolName(s.school_id)}`, at: s.created_at, tone: 'success' as const })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6)

  return (
    <div className={styles.page}>
      <DashHeader
        kicker={totalSchools === 1 ? '1 escola na rede' : `${totalSchools} escolas na rede`}
        title="Visão geral da rede"
        actions={
          <>
            <FinanceToggle />
            <LinkButton href="/superadmin/schools/new"><IconPlus /> Nova escola</LinkButton>
          </>
        }
      />

      <div className={styles.stats}>
        <StatTile label="Escolas" value={totalSchools} hint={newSchools > 0 ? `+${newSchools} ${newSchools === 1 ? 'nova' : 'novas'} este mês` : undefined} trend={newSchools > 0 ? 'up' : undefined} />
        <StatTile label="Alunos na rede" value={totalStudents} hint={newStudents > 0 ? `+${newStudents} este mês` : undefined} trend={newStudents > 0 ? 'up' : undefined} />
        <StatTile label="Receita da rede no mês" money value={<MoneyValue value={revenueMonth} />} />
        <StatTile label="Aulas na rede no mês" value={lessonsMonth.count ?? 0} />
      </div>

      <div className={styles.grid}>
        <Panel id="revenue-title" title="Receita consolidada" className={styles.span2}>
          {series.every((m) => m.value === 0) ? (
            <p className={styles.empty}>Sem receita registrada ainda na rede.</p>
          ) : (
            <>
              <p className={styles.statHint}><MoneyValue value={series.reduce((sum, m) => sum + m.value, 0)} /> recebidos nos últimos 6 meses</p>
              <div className={styles.spark}>
                <Sparkline values={series.map((m) => m.value)} width={560} height={120} className="w-full" />
              </div>
              <div className={styles.sparkLabels}>
                {series.map((m) => <span key={m.label}>{m.label}</span>)}
              </div>
            </>
          )}
        </Panel>

        <Panel id="activity-title" title="Atividade">
          {activity.length === 0 ? (
            <p className={styles.empty}>Nenhuma atividade ainda.</p>
          ) : (
            <ul className={styles.rows}>
              {activity.map((a) => (
                <li key={a.id}>
                  <div className={styles.row}>
                    <span className={`${styles.dot} ${a.tone === 'success' ? styles.dotOk : ''}`} aria-hidden="true" />
                    <span className={styles.rowMain}>
                      <span className={styles.rowName}>{a.label}</span>
                      <span className={styles.rowMeta}>{a.sub}</span>
                    </span>
                    <span className={styles.rowEnd}>{relTime(a.at, now)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="ranking-title" title="Ranking de escolas" className={styles.span3}>
          {ranking.length === 0 ? (
            <p className={styles.empty}>Nenhuma escola ainda.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.tableStack}`}>
                <thead>
                  <tr><th>Escola</th><th>Plano</th><th className={styles.num}>Alunos</th><th className={styles.num}>Faturamento no mês</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {ranking.map((s) => {
                    const adminUser = s.users?.[0]
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className={styles.rowName}>{s.custom_name || s.name}</span>
                          {adminUser && <span className={`${styles.rowMeta} ${styles.block}`}>Admin: {adminUser.name}</span>}
                        </td>
                        <td data-label="Plano"><StatusPill tone={s.plan_type === 'free' ? 'neutral' : 'brand'}>{PLAN_LABEL[s.plan_type] ?? s.plan_type}</StatusPill></td>
                        <td className={styles.num} data-label="Alunos">{s.alunos}</td>
                        <td className={styles.num} data-label="Faturamento no mês"><MoneyValue value={s.faturamento} /></td>
                        <td data-label="Status"><StatusPill tone={s.ativa ? 'success' : 'danger'}>{s.ativa ? 'Ativa' : 'Expirada'}</StatusPill></td>
                        <td className={styles.num}>
                          <div className={styles.rowEnd}>
                            <LinkButton href={`/superadmin/schools/${s.id}/edit`} variant="soft" size="sm">Editar</LinkButton>
                            {adminUser && <ImpersonateButton targetUserId={adminUser.id} label="Entrar como admin" />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
