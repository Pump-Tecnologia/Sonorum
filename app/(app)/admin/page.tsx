import Link from 'next/link'

import { Bar, DashHeader, LessonRow, Panel, RowLink, StatTile } from '@/components/dashboard/parts'
import styles from '@/components/dashboard/dashboard.module.css'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight, IconPlus } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import { FinanceToggle, MoneyValue } from '@/components/ui/FinanceVisibility'
import { requireCurrentUser } from '@/lib/auth/session'
import { getPlanContext, isSoloExperience } from '@/lib/auth/plan'
import { instrumentTone, type InstrumentTone } from '@/lib/constants/instrument-tone'
import { effectiveChargeStatus } from '@/lib/finance'
import { dayRange, monthRange } from '@/lib/format'
import { dateInBR, greetingInBR, hourInBR, longDateInBR } from '@/lib/timezone'
import { listActiveTeachers } from '@/lib/queries/teachers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }

// Cor da barra de cada categoria de instrumento (mesmos tons da agenda).
const CATEGORY_TONE: Record<string, InstrumentTone> = {
  Teclas: 'piano', Cordas: 'cordas', Voz: 'canto', 'Percussão': 'bateria', Sopros: 'violao',
}
const ATTENDANCE_ROWS = 8

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function instrumentLabel(instrument: unknown): string {
  if (Array.isArray(instrument)) return instrument.join(', ')
  return typeof instrument === 'string' ? instrument : ''
}

function pctTrend(current: number, previous: number): { text: string; trend?: 'up' | 'down' } | undefined {
  if (previous <= 0) return undefined
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: 'Igual ao mês passado' }
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% sobre o mês passado`, trend: pct > 0 ? 'up' : 'down' }
}

export default async function AdminDashboard() {
  const user = await requireCurrentUser()
  const supabase = await createClient()
  const plan = await getPlanContext()
  // Conta presa a 1 professor (Essencial, Solo, Solo Pro): sem "equipe" —
  // esconde stat/ranking que só fazem sentido comparando vários professores.
  const soloAccount = isSoloExperience(plan)

  const today = dayRange()
  const month = monthRange()
  const now = new Date()
  const [brYear, brMonth] = dateInBR(now).split('-').map(Number)
  const lastMonth = monthRange(new Date(Date.UTC(brYear, brMonth - 2, 15, 12)))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  type TodayLessonRow = { id: string; start_datetime: string; status: string; users: { name: string; instrument: unknown } | null }
  type RetentionRow = { student_id: string; status: string; users: { name: string } | null }
  type ReportEmbed = { technique_score: number; theory_score: number; repertoire_score: number; practice_score: number }
  type TeacherLessonRow = {
    teacher_id: string | null; status: string; student_id: string; start_datetime: string
    student: { name: string } | null; teacher: { name: string } | null
    lesson_reports: ReportEmbed[] | ReportEmbed | null
  }

  const [
    teacherList, lessonsToday, chargesMonth, chargesLast, retentionLessons,
    todayLessonsList, newStudentsMonth, newStudentsLast, studentsInstr,
    teacherMonthLessons, unassigned,
  ] = await Promise.all([
    user?.schoolId ? listActiveTeachers(supabase, user.schoolId) : Promise.resolve([]),
    supabase.from('lessons').select('id', { count: 'exact', head: true }).gte('start_datetime', today.start).lte('start_datetime', today.end),
    plan.features.financial
      ? supabase.from('charges').select('amount, status, due_date').gte('due_date', month.start).lte('due_date', month.end)
      : Promise.resolve({ data: [] as { amount: number; status: string; due_date: string }[] }),
    plan.features.financial
      ? supabase.from('charges').select('amount').gte('due_date', lastMonth.start).lte('due_date', lastMonth.end)
      : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase.from('lessons').select('student_id, status, users!lessons_student_id_fkey(name)').eq('status', 'canceled').gte('start_datetime', thirtyDaysAgo),
    supabase.from('lessons').select('id, start_datetime, status, users!lessons_student_id_fkey(name, instrument)').gte('start_datetime', today.start).lte('start_datetime', today.end).order('start_datetime').limit(6),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', month.start).lte('created_at', month.end + 'T23:59:59'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', lastMonth.start).lte('created_at', lastMonth.end + 'T23:59:59'),
    supabase.from('users').select('instrument_category').eq('role', 'student'),
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
  const teachers = teacherList.map((t) => {
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
    alerts.push({ label: plural(overdue.length, 'cobrança vencida', 'cobranças vencidas'), detail: <><MoneyValue value={overdueSum} /> em atraso</>, href: '/financial', tone: 'danger' })
  if ((unassigned.count ?? 0) > 0)
    alerts.push({ label: plural(unassigned.count ?? 0, 'aula sem professor', 'aulas sem professor'), detail: 'Atribua na agenda', href: '/schedule', tone: 'warning' })
  if (pendingTotal > 0)
    alerts.push({ label: plural(pendingTotal, 'presença para lançar', 'presenças para lançar'), detail: 'Aulas que já passaram', href: '/schedule', tone: 'warning' })
  for (const r of retentionRisk.filter((r) => r.count >= 3))
    alerts.push({ label: `${r.name} cancelou ${r.count} aulas`, detail: 'Risco de evasão', href: `/admin/students/${r.id}`, tone: 'danger' })

  const todayList = (todayLessonsList.data ?? []) as unknown as TodayLessonRow[]
  const firstName = (user?.name ?? '').split(' ')[0]
  const studentsTrend = pctTrend(newThisMonth, newLastMonth)
  const revenueTrend = pctTrend(expectedRevenue, lastRevenue)

  return (
    <div className={styles.page}>
      <DashHeader
        kicker={longDateInBR(now)}
        title={firstName ? `${greetingInBR(now)}, ${firstName}` : greetingInBR(now)}
        actions={
          <>
            {plan.features.financial && <FinanceToggle />}
            <LinkButton href="/admin/students/new"><IconPlus /> Novo aluno</LinkButton>
          </>
        }
      />

      {isFree && (
        <div className={styles.planBanner}>
          <p><strong>Plano {plan.features.label} com {studentLimitLabel} alunos.</strong> Nos planos pagos você tem alunos ilimitados, financeiro e relatórios.</p>
          <LinkButton href="/upgrade" className={styles.planCta}>Ver planos <IconArrowRight /></LinkButton>
        </div>
      )}

      <div className={styles.stats}>
        <StatTile
          href="/admin/students"
          label="Alunos"
          value={studentLimitLabel}
          hint={studentsTrend?.text ?? plural(newThisMonth, 'novo este mês', 'novos este mês')}
          trend={studentsTrend?.trend}
        />
        {!soloAccount && <StatTile href="/admin/teachers" label="Professores" value={teacherList.length} />}
        <StatTile href="/schedule" label="Aulas hoje" value={lessonsToday.count ?? 0} />
        {plan.features.financial ? (
          <StatTile
            href="/financial"
            label="Receita prevista no mês"
            value={<MoneyValue value={expectedRevenue} />}
            hint={revenueTrend?.text}
            trend={revenueTrend?.trend}
          />
        ) : (
          <StatTile label="Receita prevista" value="—" hint="Nos planos pagos" />
        )}
      </div>

      <div className={styles.grid}>
        <Panel id="today-title" title="Aulas de hoje" link={{ href: '/schedule', label: 'Agenda' }} className={styles.span2}>
          {todayList.length === 0 ? (
            <p className={styles.empty}>Nenhuma aula hoje.</p>
          ) : (
            <ul className={styles.rows}>
              {todayList.map((l) => (
                <LessonRow
                  key={l.id}
                  href={`/lessons/${l.id}/planner`}
                  time={hourInBR(l.start_datetime)}
                  name={l.users?.name ?? 'Aluno'}
                  meta={instrumentLabel(l.users?.instrument)}
                  tone={instrumentTone(l.users?.instrument)}
                  status={l.status}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="alerts-title"
          title="Atenção"
          badge={alerts.length > 0 ? <StatusPill tone="danger">{alerts.length}</StatusPill> : undefined}
        >
          {alerts.length === 0 ? (
            <p className={styles.empty}>Tudo em dia.</p>
          ) : (
            <ul className={styles.rows}>
              {alerts.slice(0, 5).map((a) => (
                <RowLink key={`${a.href}-${String(a.label)}`} href={a.href} label={a.label} detail={a.detail} tone={a.tone} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="instruments-title" title="Alunos por instrumento">
          {instruments.length === 0 ? (
            <p className={styles.empty}>Nenhum aluno cadastrado.</p>
          ) : (
            <ul className={styles.bars}>
              {instruments.map((inst) => (
                <Bar key={inst.label} label={inst.label} value={inst.count} total={instrTotal} tone={CATEGORY_TONE[inst.label] ?? 'outro'} />
              ))}
            </ul>
          )}
        </Panel>

        {/* Professores do mês — só faz sentido comparando uma equipe */}
        {!soloAccount && (
          <Panel id="teachers-title" title="Professores do mês" link={{ href: '/admin/teachers', label: 'Professores' }} className={styles.span2}>
            {teachers.length === 0 ? (
              <p className={styles.empty}>Nenhum professor cadastrado.</p>
            ) : (
              <ul className={styles.rows}>
                {teachers.map((t) => (
                  <li key={t.id}>
                    <div className={styles.row}>
                      <span className={styles.rowMain}><span className={styles.rowName}>{t.name}</span></span>
                      <span className={styles.rowEnd}>
                        <span><strong>{t.completed}</strong> aulas</span>
                        <span><strong>{t.students}</strong> alunos</span>
                        {t.avg && <StatusPill tone={Number(t.avg) >= 4 ? 'success' : 'neutral'}>Nota {t.avg}</StatusPill>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel id="retention-title" title="Risco de evasão" info="Alunos com mais aulas canceladas nos últimos 30 dias.">
          {retentionRisk.length === 0 ? (
            <p className={styles.empty}>Nenhum cancelamento recente.</p>
          ) : (
            <ul className={styles.rows}>
              {retentionRisk.map((r) => (
                <RowLink
                  key={r.id}
                  href={`/admin/students/${r.id}`}
                  label={r.name}
                  end={<StatusPill tone={r.count >= 3 ? 'danger' : 'warning'}>{plural(r.count, 'cancelada', 'canceladas')}</StatusPill>}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          id="attendance-title"
          title="Frequência do mês"
          info={`Os ${ATTENDANCE_ROWS} alunos com menor frequência aparecem primeiro.`}
          link={{ href: '/admin/students', label: 'Alunos' }}
          className={styles.span2}
        >
          {attendance.length === 0 ? (
            <p className={styles.empty}>Sem presenças registradas no mês.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Aluno</th><th className={styles.num}>Presenças</th><th className={styles.num}>Faltas</th><th className={styles.num}>Taxa</th></tr>
                </thead>
                <tbody>
                  {attendance.slice(0, ATTENDANCE_ROWS).map((a) => (
                    <tr key={a.id}>
                      <td><Link href={`/admin/students/${a.id}`}>{a.name}</Link></td>
                      <td className={styles.num}>{a.attended}</td>
                      <td className={styles.num}>{a.missed}</td>
                      <td className={styles.num}><StatusPill tone={a.rate >= 80 ? 'success' : a.rate >= 60 ? 'warning' : 'danger'}>{a.rate}%</StatusPill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel id="productivity-title" title={soloAccount ? 'Sua produtividade no mês' : 'Produtividade no mês'} className={pendingTotal > 0 ? styles.span2 : styles.span3}>
          {productivity.length === 0 ? (
            <p className={styles.empty}>Sem aulas no mês.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Professor</th><th className={styles.num}>Realizadas</th><th className={styles.num}>Faltas</th><th className={styles.num}>A lançar</th><th className={styles.num}>Conclusão</th></tr>
                </thead>
                <tbody>
                  {productivity.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td className={styles.num}>{p.done}</td>
                      <td className={styles.num}>{p.missed}</td>
                      <td className={styles.num}>{p.toMark}</td>
                      <td className={styles.num}><StatusPill tone={p.doneRate >= 80 ? 'success' : p.doneRate >= 50 ? 'warning' : 'neutral'}>{p.doneRate}%</StatusPill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {pendingTotal > 0 && (
          <Panel id="pending-title" title="Presenças para lançar" info="Aulas que já passaram e continuam como Agendada, sem a presença registrada." link={{ href: '/schedule', label: 'Agenda' }}>
            <ul className={styles.rows}>
              {pendings.map((p) => (
                <li key={p.name}>
                  <div className={styles.row}>
                    <span className={styles.rowMain}><span className={styles.rowName}>{p.name}</span></span>
                    <span className={styles.rowEnd}><StatusPill tone="warning">{plural(p.count, 'aula', 'aulas')}</StatusPill></span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}
