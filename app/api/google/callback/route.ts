import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/session'
import { exchangeCodeForTokens, isGoogleCalendarEnabled } from '@/lib/calendar'
import { encryptToken } from '@/lib/calendar/crypto'
import { appBaseUrl } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

// Callback do OAuth: troca o code por tokens e salva a conexão (refresh cifrado).
export async function GET(req: Request) {
  const base = appBaseUrl()
  const back = `${base}/profile`
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const me = await getCurrentUser()
  // state === me.id evita usar o fluxo de outra sessão.
  if (!me || !isGoogleCalendarEnabled() || !code || state !== me.id) {
    return NextResponse.redirect(`${back}?gcal=error`)
  }

  const tokens = await exchangeCodeForTokens(code)
  if (!tokens.ok) return NextResponse.redirect(`${back}?gcal=error`)

  const enc = await encryptToken(tokens.refreshToken)
  const admin = await createAdminClient()
  const now = new Date().toISOString()
  await admin.from('google_calendar_connections').upsert(
    {
      user_id: me.id,
      school_id: me.schoolId,
      provider: 'google',
      calendar_id: 'primary',
      refresh_token_enc: enc,
      scope: tokens.scope,
      revoked_at: null,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,provider' },
  )

  return NextResponse.redirect(`${back}?gcal=connected`)
}
