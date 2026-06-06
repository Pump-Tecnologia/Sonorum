import 'server-only'

import type { CalendarProvider, CalendarEventInput } from '@/lib/calendar/types'

// Adapter REST do Google Calendar (sem SDK). Recebe o refresh token (já
// decifrado), troca por access token e cria/atualiza/apaga o evento.
// Inerte até GOOGLE_CLIENT_ID/SECRET existirem (ver index.ts).

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'

async function accessTokenFromRefresh(refreshToken: string): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) return null
  const json = (await res.json().catch(() => ({}))) as { access_token?: string }
  return json.access_token ?? null
}

function toGoogleEvent(e: CalendarEventInput) {
  return {
    summary: e.title,
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    start: { dateTime: e.startISO },
    end: { dateTime: e.endISO },
  }
}

export function googleCalendarProvider(): CalendarProvider {
  return {
    name: 'google',
    async upsertEvent(refreshToken, calendarId, event, externalEventId) {
      const token = await accessTokenFromRefresh(refreshToken)
      if (!token) return { ok: false, error: 'Falha ao renovar o acesso ao Google.' }
      const base = `${API}/calendars/${encodeURIComponent(calendarId)}/events`
      const url = externalEventId ? `${base}/${encodeURIComponent(externalEventId)}` : base
      try {
        const res = await fetch(url, {
          method: externalEventId ? 'PATCH' : 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(toGoogleEvent(event)),
        })
        const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } }
        if (!res.ok) return { ok: false, error: json.error?.message ?? `Google ${res.status}` }
        return { ok: true, externalEventId: json.id ?? externalEventId ?? null }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Falha ao sincronizar com o Google.' }
      }
    },
    async deleteEvent(refreshToken, calendarId, externalEventId) {
      const token = await accessTokenFromRefresh(refreshToken)
      if (!token) return { ok: false, error: 'Falha ao renovar o acesso ao Google.' }
      try {
        const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        // 410 = já removido; tratamos como sucesso.
        if (!res.ok && res.status !== 410 && res.status !== 404) return { ok: false, error: `Google ${res.status}` }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Falha ao remover no Google.' }
      }
    },
  }
}
