import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/lib/types/database'

// Refresh + live account/profile validation. A valid JWT alone may outlive a
// deleted account. Routing stays in proxy.ts; all cookie/cache headers travel
// with redirects there as well.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          const previous = response
          response = NextResponse.next({ request })
          previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
          for (const key of ['cache-control', 'expires', 'pragma']) {
            const value = previous.headers.get(key)
            if (value) response.headers.set(key, value)
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  const unavailable = (error: { name?: string; status?: number }) =>
    error.name === 'AuthRetryableFetchError' || error.status === 0 || (error.status ?? 0) >= 500
  const anonymous = () => ({ response, claims: null, verificationUnavailable: false })
  const failed = () => ({ response, claims: null, verificationUnavailable: true })
  const clearSession = async () => {
    // Only the current session; never revoke the user's other devices here.
    await supabase.auth.signOut({ scope: 'local' })
    return anonymous()
  }

  const { data, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError) return unavailable(claimsError) ? failed() : clearSession()
  if (!data?.claims) return anonymous()

  const { data: account, error: accountError } = await supabase.auth.getUser()
  if (accountError) return unavailable(accountError) ? failed() : clearSession()
  if (!account.user || account.user.id !== data.claims.sub) return clearSession()

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', account.user.id)
    .maybeSingle()
  // A database/network outage must not silently erase a valid session.
  if (profileError) return failed()
  if (!profile || profile.role !== data.claims.user_role || profile.school_id !== data.claims.school_id) {
    return clearSession()
  }

  return {
    response,
    claims: data.claims,
    verificationUnavailable: false,
  }
}
