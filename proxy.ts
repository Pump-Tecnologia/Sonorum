import { NextResponse, type NextRequest } from 'next/server'

import { homeForRole, ROLE_ALLOWED_PREFIXES, type Role } from '@/lib/constants/roles'
import { updateSession } from '@/lib/supabase/middleware'

// Next 16 renomeou a convenção `middleware` → `proxy` (mesma assinatura).
// Faz refresh da sessão Supabase, protege a área autenticada e roteia por papel.

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
]

function isUnder(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request)
  const path = request.nextUrl.pathname
  const role = (claims?.user_role as Role | undefined) ?? null
  const isAuthed = Boolean(claims)

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
