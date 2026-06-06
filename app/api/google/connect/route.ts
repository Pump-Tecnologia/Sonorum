import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/session'
import { googleAuthUrl, isGoogleCalendarEnabled } from '@/lib/calendar'
import { appBaseUrl } from '@/lib/payments'

// Inicia o OAuth do Google Calendar. Inerte (redireciona com aviso) sem creds.
export async function GET() {
  const base = appBaseUrl()
  const me = await getCurrentUser()
  if (!me) return NextResponse.redirect(`${base}/login`)
  if (!isGoogleCalendarEnabled()) return NextResponse.redirect(`${base}/profile?gcal=unavailable`)
  return NextResponse.redirect(googleAuthUrl(me.id))
}
