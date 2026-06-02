import { NextResponse, type NextRequest } from 'next/server'

import { homeForRole, ROLE_ALLOWED_PREFIXES, type Role } from '@/lib/constants/roles'
import { updateSession } from '@/lib/supabase/middleware'

// Next 16 renomeou a convenção `middleware` → `proxy` (mesma assinatura).
// Faz refresh da sessão Supabase, separa marketing↔app por hostname (em prod),
// protege a área autenticada e roteia por papel.

// Hostnames de PRODUÇÃO. Fora deles (sonorum.vercel.app, previews, localhost),
// o proxy NÃO separa marketing/app — comportamento all-in-one (preserva dev).
const MARKETING_HOSTS = new Set(['sonorum.com.br', 'www.sonorum.com.br'])
const APP_HOST = 'app.sonorum.com.br'

// A área autenticada vive nos route groups (auth)/(app); na URL aparece como
// /admin, /teacher, /student, /superadmin, /schedule, etc. A marketing é '/'.
const APP_PREFIXES = [
  '/dashboard',
  '/superadmin',
  '/admin',
  '/teacher',
  '/student',
  '/schedule',
  '/resources',
  '/financial',
  '/plans',
  '/lessons',
  '/profile',
  '/upgrade',
  '/student',
  '/teacher',
]

function isUnder(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request)
  const path = request.nextUrl.pathname
  const role = (claims?.user_role as Role | undefined) ?? null
  const isAuthed = Boolean(claims)

  // ── Split por hostname (produção) ────────────────────────────────────────
  // A LP tem 1 rota só ('/'). Tudo o mais é app/auth.
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const isMarketingHost = MARKETING_HOSTS.has(host)
  const isAppHost = host === APP_HOST

  // sonorum.com.br só serve '/'. Qualquer outra rota → app.sonorum.com.br
  // (mantém path e query; redirect 308 = permanente, ajuda em SEO/cache).
  if (isMarketingHost && path !== '/') {
    const target = new URL(`https://${APP_HOST}${path}${request.nextUrl.search}`)
    return NextResponse.redirect(target, 308)
  }

  // app.sonorum.com.br não tem LP. '/' → dashboard (logado) ou login.
  if (isAppHost && path === '/') {
    return NextResponse.redirect(new URL(isAuthed ? '/dashboard' : '/login', request.url))
  }

  // Usuário logado tentando acessar páginas de auth → manda pra home do role.
  if (isAuthed && isUnder(path, ['/login', '/register'])) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url))
  }

  // Rota da área autenticada sem sessão → login.
  if (!isAuthed && isUnder(path, APP_PREFIXES)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // /dashboard é um hub que redireciona para a home do papel.
  if (isAuthed && path === '/dashboard') {
    return NextResponse.redirect(new URL(homeForRole(role), request.url))
  }

  // Autorização por prefixo: impede um papel de acessar área de outro.
  if (isAuthed && role && isUnder(path, APP_PREFIXES)) {
    const allowed = ROLE_ALLOWED_PREFIXES[role] ?? []
    if (!isUnder(path, allowed)) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url))
    }
  }

  return response
}

export const config = {
  // Roda em tudo, menos assets estáticos e imagens.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
