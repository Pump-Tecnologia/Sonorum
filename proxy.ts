import { NextResponse, type NextRequest } from 'next/server'

import { homeForRole, ROLE_ALLOWED_PREFIXES, ROLE_HOME, type Role } from '@/lib/constants/roles'
import { updateSession } from '@/lib/supabase/middleware'

// Next 16 renomeou a convenção `middleware` → `proxy` (mesma assinatura).
// Este app é só a área autenticada (app.sonorum.com.br). A marketing/blog vive
// num app separado (sonorum.com.br). Aqui: refresh da sessão Supabase, proteção
// da área autenticada e roteamento por papel.

// Área autenticada: na URL aparece como /admin, /teacher, /student, etc.
const APP_PREFIXES = [
  '/dashboard',
  '/superadmin',
  '/admin',
  '/teacher',
  '/student',
  '/schedule',
  '/resources',
  '/modelos',
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
  const { response, claims, verificationUnavailable } = await updateSession(request)
  const path = request.nextUrl.pathname
  const role = (claims?.user_role as Role | undefined) ?? null
  const isAuthed = Boolean(claims)
  function withSessionCookies(result: NextResponse) {
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie))
    for (const key of ['cache-control', 'expires', 'pragma']) {
      const value = response.headers.get(key)
      if (value) result.headers.set(key, value)
    }
    result.headers.set('Cache-Control', 'private, no-store')
    return result
  }
  const redirect = (url: URL) => withSessionCookies(NextResponse.redirect(url))

  if (verificationUnavailable && (path === '/' || isUnder(path, [...APP_PREFIXES, '/login', '/register']))) {
    return withSessionCookies(new NextResponse('Não foi possível verificar sua sessão. Tente novamente.', { status: 503 }))
  }

  // Sem landing aqui: '/' → home do papel (logado) ou login.
  if (path === '/') {
    const destination = isAuthed ? (role ? '/dashboard' : '/login?error=role') : '/login'
    return redirect(new URL(destination, request.url))
  }

  // Usuário logado tentando acessar páginas de auth → manda pra home do role.
  if (isAuthed && role && isUnder(path, ['/login', '/register'])) {
    return redirect(new URL(homeForRole(role), request.url))
  }

  // Rota da área autenticada sem sessão → login.
  if (!isAuthed && isUnder(path, APP_PREFIXES)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    return redirect(url)
  }

  // /dashboard é um hub que redireciona para a home do papel.
  if (isAuthed && path === '/dashboard') {
    return redirect(new URL(homeForRole(role), request.url))
  }

  // Autorização por prefixo: impede um papel de acessar área de outro.
  if (isAuthed && isUnder(path, APP_PREFIXES)) {
    if (!role || !Object.hasOwn(ROLE_HOME, role)) {
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'role')
      return redirect(url)
    }
    const allowed = ROLE_ALLOWED_PREFIXES[role] ?? []
    if (!isUnder(path, allowed)) {
      return redirect(new URL(homeForRole(role), request.url))
    }
  }

  return response
}

export const config = {
  // Roda em tudo, menos assets estáticos e imagens.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
