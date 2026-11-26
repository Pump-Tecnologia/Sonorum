// Exercise real routing and session adapters; no network or privileged keys.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { NextRequest, NextResponse } = require('next/server')
function load(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, process, URL, require: id => id in mocks ? mocks[id] : require(id) })
  return exports
}
const claims = { sub: 'qa', user_role: 'teacher', school_id: 'school' }
function scenario({ token = claims, claimError = null, accountError = null, profileError = null, profile = { role: 'teacher', school_id: 'school' }, user = { id: 'qa' }, anonymous = false, refresh = false } = {}) {
  let adapter, signedOut = 0
  const auth = {
    getClaims: async () => {
      if (refresh) adapter.setAll([{ name: 'qa-session', value: 'renewed', options: { httpOnly: true, path: '/' } }], { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' })
      return { data: anonymous ? null : { claims: token }, error: claimError }
    },
    getUser: async () => ({ data: { user }, error: accountError }),
    signOut: async ({ scope }) => {
      assert.equal(scope, 'local'); signedOut++
      adapter.setAll([{ name: 'qa-session', value: '', options: { maxAge: 0, path: '/' } }], { 'Cache-Control': 'private, no-store' })
      return { error: null }
    },
  }
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: profile, error: profileError }) }
  const { updateSession } = load('../lib/supabase/middleware.ts', {
    'next/server': { NextResponse },
    '@supabase/ssr': { createServerClient: (_url, _key, options) => { adapter = options.cookies; return { auth, from: () => query } } },
  })
  const roles = load('../lib/constants/roles.ts', {})
  const { proxy } = load('../proxy.ts', { 'next/server': { NextResponse }, '@/lib/constants/roles': roles, '@/lib/supabase/middleware': { updateSession } })
  return { route: path => proxy(new NextRequest(`https://qa.sonorum.test${path}`)), signedOut: () => signedOut }
}
test('removed account: login renders and session deletion survives protected redirect', async () => {
  for (const path of ['/login', '/teacher']) {
    const s = scenario({ accountError: { status: 403, name: 'AuthApiError' }, refresh: true })
    const result = await s.route(path)
    assert.equal(result.status, path === '/login' ? 200 : 307)
    assert.equal(result.cookies.get('qa-session').value, '')
    assert.equal(result.cookies.get('qa-session').maxAge, 0)
    assert.equal(result.headers.get('pragma'), 'no-cache')
    assert.equal(s.signedOut(), 1)
    if (path === '/teacher') assert.equal(new URL(result.headers.get('location')).pathname, '/login')
  }
})
test('missing profile or changed school/role clears only the local session', async () => {
  for (const profile of [null, { role: 'teacher', school_id: 'other' }, { role: 'student', school_id: 'school' }]) {
    const s = scenario({ profile }); const result = await s.route('/register')
    assert.equal(result.status, 200); assert.equal(s.signedOut(), 1)
    assert.equal(result.cookies.get('qa-session').maxAge, 0)
  }
})
test('transient auth and database failures return 503 without logout or redirect', async () => {
  for (const options of [{ claimError: { name: 'AuthRetryableFetchError' } }, { accountError: { status: 503 } }, { profileError: { message: 'network unavailable' } }]) {
    const s = scenario(options); const result = await s.route('/teacher')
    assert.equal(result.status, 503); assert.equal(s.signedOut(), 0)
    assert.equal(result.headers.get('location'), null)
  }
})
test('valid refresh cookies reach redirect and roles remain isolated', async () => {
  const s = scenario({ refresh: true })
  for (const path of ['/login', '/register', '/admin', '/dashboard']) {
    const result = await s.route(path)
    assert.equal(new URL(result.headers.get('location')).pathname, '/teacher')
    assert.equal(result.cookies.get('qa-session').value, 'renewed')
    assert.equal(result.cookies.get('qa-session').httpOnly, true)
    assert.match(result.headers.get('cache-control'), /no-store/)
  }
  assert.equal((await s.route('/teacher')).status, 200)
  assert.equal(s.signedOut(), 0)
})
test('anonymous and expired sessions can reach login without a circular redirect', async () => {
  const anon = scenario({ anonymous: true })
  assert.equal((await anon.route('/login')).status, 200)
  assert.equal((await anon.route('/teacher')).status, 307)
  const expired = scenario({ claimError: { status: 400, name: 'AuthApiError' } })
  assert.equal((await expired.route('/login')).status, 200)
  assert.equal(expired.signedOut(), 1)
})
test('page guard redirects before a page can dereference a missing user', async () => {
  const { requireCurrentUser } = load('../lib/auth/session.ts', {
    react: { cache: fn => fn },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`) } },
    '@/lib/constants/roles': {},
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  })
  await assert.rejects(requireCurrentUser(), /REDIRECT:\/login/)
})

test('superadmin without school keeps valid access', async () => {
  const s = scenario({ token: { ...claims, user_role: 'superadmin', school_id: null }, profile: { role: 'superadmin', school_id: null } })
  const result = await s.route('/login')
  assert.equal(new URL(result.headers.get('location')).pathname, '/superadmin')
  assert.equal((await s.route('/superadmin')).status, 200)
  assert.equal(s.signedOut(), 0)
})
