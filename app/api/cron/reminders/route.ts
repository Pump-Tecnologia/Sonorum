import { NextResponse } from 'next/server'

import { notify } from '@/lib/notifications/notify'
import { createAdminClient } from '@/lib/supabase/server'
import { startOfTodayBR, startOfTomorrowBR } from '@/lib/timezone'

// Endpoint de cron — chamado pelo Vercel Cron (ou cron-job.org) diariamente.
// Protegido por bearer (CRON_SECRET). Roda 3 lembretes diários:
//   - lesson.tomorrow   (aulas que começam nas próximas 24-48h)
//   - charge.due_soon   (cobranças pendentes vencendo em 3 dias)
//   - charge.overdue    (cobranças vencidas HOJE, primeiro dia de atraso)
//
// Idempotente por dia: olha o log p/ não enviar a mesma coisa 2× no mesmo dia.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RemindersSummary {
  ok: boolean
  lessons: number
  dueSoon: number
  overdue: number
  skippedDuplicates: number
  errors: string[]
}

async function alreadySent(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  event: string,
  relatedId: string,
  sinceISO: string,
): Promise<boolean> {
  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('event', event)
    .eq('related_id', relatedId)
    .gte('created_at', sinceISO)
    .limit(1)
  return (data?.length ?? 0) > 0
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const summary: RemindersSummary = { ok: true, lessons: 0, dueSoon: 0, overdue: 0, skippedDuplicates: 0, errors: [] }

  // Janelas no fuso BRT (não no fuso da Vercel, que é UTC) — assim "aula
  // amanhã" e "vence hoje" significam o que o usuário entende.
  const now = new Date()
  const startOfToday = startOfTodayBR(now)
  const startOfTomorrow = startOfTomorrowBR(now)
  const endOfTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000)
  const todayISO = startOfToday.toISOString().slice(0, 10)

  // ── 1. Aulas amanhã ────────────────────────────────────────────────────────
  try {
    const { data: lessons } = await admin
      .from('lessons')
      .select('id, title, start_datetime, student_id, room:rooms(name), teacher:users!lessons_teacher_id_fkey(name)')
      .gte('start_datetime', startOfTomorrow.toISOString())
      .lt('start_datetime', endOfTomorrow.toISOString())
      .neq('status', 'canceled')

    for (const l of lessons ?? []) {
      if (await alreadySent(admin, 'lesson.tomorrow', l.id, startOfToday.toISOString())) {
        summary.skippedDuplicates++
        continue
      }
      const start = new Date(l.start_datetime)
      await notify('lesson.tomorrow', l.student_id, {
        title: l.title,
        time: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        room: (l.room as { name: string } | null)?.name ?? null,
        teacherName: (l.teacher as { name: string } | null)?.name ?? null,
      }, { relatedId: l.id })
      summary.lessons++
    }
  } catch (err) {
    summary.errors.push(`lessons: ${err instanceof Error ? err.message : 'err'}`)
  }

  // ── 2. Cobranças vencendo em 3 dias ────────────────────────────────────────
  try {
    const in3 = new Date(startOfToday); in3.setDate(in3.getDate() + 3)
    const in3ISO = in3.toISOString().slice(0, 10)
    const { data: charges } = await admin
      .from('charges')
      .select('id, amount, due_date, enrollment:enrollments(student_id, plan:plans(name))')
      .eq('status', 'pending')
      .eq('due_date', in3ISO)
    for (const c of charges ?? []) {
      if (await alreadySent(admin, 'charge.due_soon', c.id, startOfToday.toISOString())) {
        summary.skippedDuplicates++
        continue
      }
      const enr = c.enrollment as { student_id: string; plan: { name: string } | null } | null
      if (!enr) continue
      await notify('charge.due_soon', enr.student_id, {
        amount: Number(c.amount),
        dueDate: new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
        daysLeft: 3,
        planName: enr.plan?.name ?? null,
      }, { relatedId: c.id })
      summary.dueSoon++
    }
  } catch (err) {
    summary.errors.push(`due_soon: ${err instanceof Error ? err.message : 'err'}`)
  }

  // ── 3. Cobranças vencidas HOJE ─────────────────────────────────────────────
  try {
    const yesterdayISO = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: charges } = await admin
      .from('charges')
      .select('id, amount, due_date, enrollment:enrollments(student_id, plan:plans(name))')
      .eq('status', 'pending')
      .eq('due_date', yesterdayISO)
    for (const c of charges ?? []) {
      if (await alreadySent(admin, 'charge.overdue', c.id, startOfToday.toISOString())) {
        summary.skippedDuplicates++
        continue
      }
      const enr = c.enrollment as { student_id: string; plan: { name: string } | null } | null
      if (!enr) continue
      await notify('charge.overdue', enr.student_id, {
        amount: Number(c.amount),
        dueDate: new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
        planName: enr.plan?.name ?? null,
      }, { relatedId: c.id })
      summary.overdue++
    }
  } catch (err) {
    summary.errors.push(`overdue: ${err instanceof Error ? err.message : 'err'}`)
  }

  return NextResponse.json({ ...summary, ranAt: todayISO })
}
