import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { safeInternalRedirect } from '@/lib/auth/redirects'

// Troca o `code` ou token de recuperação do e-mail por uma sessão SSR.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const verificationType = searchParams.get('type')
  const next = safeInternalRedirect(searchParams.get('next'))

  if (code || (tokenHash && verificationType === 'recovery')) {
    const supabase = await createClient()
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' })
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
