import 'server-only'

import { googleCalendarProvider } from '@/lib/calendar/google'
import { mockCalendarProvider } from '@/lib/calendar/mock'
import type { CalendarProvider } from '@/lib/calendar/types'
import { appBaseUrl } from '@/lib/payments'

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

// Liga o provider Google só se as credenciais existirem e não estiver forçado
// manual. Sem isso, tudo cai no mock (no-op) — a integração fica inerte.
export function isGoogleCalendarEnabled(): boolean {
  if (process.env.GOOGLE_CALENDAR_PROVIDER === 'mock') return false
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CALENDAR_ENC_KEY)
}

export function getCalendarProvider(): CalendarProvider {
  return isGoogleCalendarEnabled() ? googleCalendarProvider() : mockCalendarProvider()
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl()}/api/google/callback`
}

// URL de consentimento OAuth (offline + consent → garante refresh token).
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPE,
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Troca o code do callback por tokens. Retorna o refresh token (1ª autorização).
export async function exchangeCodeForTokens(code: string): Promise<{ ok: true; refreshToken: string; scope: string | null } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirect_uri: googleRedirectUri(),
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as { refresh_token?: string; scope?: string; error_description?: string }
  if (!res.ok || !json.refresh_token) {
    return { ok: false, error: json.error_description ?? 'Não foi possível conectar (sem refresh token — reconecte concedendo acesso offline).' }
  }
  return { ok: true, refreshToken: json.refresh_token, scope: json.scope ?? null }
}
