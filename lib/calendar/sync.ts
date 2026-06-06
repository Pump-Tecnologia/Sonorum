import 'server-only'

import { getCalendarProvider, isGoogleCalendarEnabled } from '@/lib/calendar'
import { decryptToken } from '@/lib/calendar/crypto'
import type { CalendarEventInput } from '@/lib/calendar/types'
import { createAdminClient } from '@/lib/supabase/server'

type Conn = { user_id: string; calendar_id: string; refresh_token_enc: string }

// Empurra uma aula para as agendas dos participantes (professor + aluno)
// conectados. No-op enquanto o Google não estiver configurado.
export async function syncLessonToCalendars(lessonId: string): Promise<void> {
  if (!isGoogleCalendarEnabled()) return
  const admin = await createAdminClient()

  const { data: lesson } = await admin
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, student_id, teacher_id, room:rooms(name)')
    .eq('id', lessonId)
    .maybeSingle()
  if (!lesson) return
  if (lesson.status === 'canceled') { await removeLessonFromCalendars(lessonId); return }

  const participantIds = [lesson.student_id, lesson.teacher_id].filter(Boolean) as string[]
  if (participantIds.length === 0) return

  const { data: conns } = await admin
    .from('google_calendar_connections')
    .select('user_id, calendar_id, refresh_token_enc')
    .in('user_id', participantIds)
    .is('revoked_at', null)
  if (!conns?.length) return

  const provider = getCalendarProvider()
  const room = (lesson.room as { name: string } | null)?.name ?? null
  const event: CalendarEventInput = {
    title: lesson.title,
    description: 'Aula — Sonorum',
    // ISO UTC explícito (…Z) pro Google interpretar o instante sem ambiguidade
    // de fuso e exibir no fuso do usuário.
    startISO: new Date(lesson.start_datetime).toISOString(),
    endISO: new Date(lesson.end_datetime).toISOString(),
    location: room,
  }

  for (const c of conns as Conn[]) {
    let refresh: string
    try { refresh = await decryptToken(c.refresh_token_enc) } catch { continue }
    const { data: map } = await admin
      .from('lesson_calendar_events')
      .select('external_event_id')
      .eq('lesson_id', lessonId)
      .eq('user_id', c.user_id)
      .maybeSingle()
    const res = await provider.upsertEvent(refresh, c.calendar_id, event, map?.external_event_id ?? null)
    if (res.ok && res.externalEventId) {
      await admin.from('lesson_calendar_events').upsert(
        { lesson_id: lessonId, user_id: c.user_id, provider: 'google', external_event_id: res.externalEventId },
        { onConflict: 'lesson_id,user_id,provider' },
      )
    }
  }
}

// Remove os eventos de uma aula (cancelamento/exclusão) das agendas externas.
export async function removeLessonFromCalendars(lessonId: string): Promise<void> {
  if (!isGoogleCalendarEnabled()) return
  const admin = await createAdminClient()
  const { data: maps } = await admin
    .from('lesson_calendar_events')
    .select('user_id, external_event_id')
    .eq('lesson_id', lessonId)
  if (!maps?.length) return

  const provider = getCalendarProvider()
  for (const m of maps as { user_id: string; external_event_id: string }[]) {
    const { data: conn } = await admin
      .from('google_calendar_connections')
      .select('calendar_id, refresh_token_enc')
      .eq('user_id', m.user_id)
      .is('revoked_at', null)
      .maybeSingle()
    if (!conn) continue
    let refresh: string
    try { refresh = await decryptToken(conn.refresh_token_enc) } catch { continue }
    await provider.deleteEvent(refresh, conn.calendar_id, m.external_event_id)
  }
  await admin.from('lesson_calendar_events').delete().eq('lesson_id', lessonId)
}
