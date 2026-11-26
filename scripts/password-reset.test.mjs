// Regressão local sem rede: valida regras de redefinição de senha e recuperação.
// Rode com: node --test scripts/password-reset.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function load(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    process,
    require: (id) => {
      if (id in mocks) return mocks[id]
      if (id === './schemas') return load('../lib/auth/schemas.ts', mocks)
      return require(id)
    },
  })
  return exports
}

test('resetUserPassword bloqueia quem não é admin da escola', async () => {
  const { resetUserPassword } = load('../lib/actions/credentials.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-1' }) },
    '@/lib/security/rate-limit': { rateLimit: async () => ({ ok: true }), RATE_LIMIT_MESSAGE: 'Limite' },
    '@/lib/supabase/server': { createAdminClient: async () => ({}) },
    '@/lib/notifications/credentials': { sendCredentialsEmail: async () => ({ ok: true }) },
  })

  const form = new FormData()
  form.set('userId', 'user-1')
  const res = await resetUserPassword({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Acesso negado.')
})

test('resetUserPassword bloqueia redefinição de usuário de outra escola', async () => {
  const { resetUserPassword } = load('../lib/actions/credentials.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/security/rate-limit': { rateLimit: async () => ({ ok: true }), RATE_LIMIT_MESSAGE: 'Limite' },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'user-2', school_id: 'school-2', role: 'student', email: 'aluno@outra.com' },
              }),
            }),
          }),
        }),
      }),
    },
    '@/lib/notifications/credentials': { sendCredentialsEmail: async () => ({ ok: true }) },
  })

  const form = new FormData()
  form.set('userId', 'user-2')
  const res = await resetUserPassword({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Usuário não encontrado nesta escola.')
})

test('resetUserPassword envia link de uso único quando usuário pertence à escola', async () => {
  let emailSent = false
  const { resetUserPassword } = load('../lib/actions/credentials.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/security/rate-limit': { rateLimit: async () => ({ ok: true }), RATE_LIMIT_MESSAGE: 'Limite' },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'user-1',
                  name: 'Aluno QA',
                  email: 'aluno@escola1.com',
                  role: 'student',
                  school_id: 'school-1',
                  schools: { name: 'Escola QA', custom_name: null },
                },
              }),
            }),
          }),
        }),
      }),
    },
    '@/lib/notifications/credentials': {
      sendCredentialsEmail: async ({ to, kind }) => {
        if (to === 'aluno@escola1.com' && kind === 'reset') emailSent = true
        return { ok: true }
      },
    },
  })

  const form = new FormData()
  form.set('userId', 'user-1')
  const res = await resetUserPassword({ ok: false }, form)
  assert.equal(res.ok, true)
  assert.equal(emailSent, true)
  assert.match(res.message, /Link de redefinição enviado/)
})

test('requestPasswordReset valida formato do e-mail e responde de forma neutra', async () => {
  const { requestPasswordReset } = load('../lib/auth/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    'next/headers': { cookies: async () => ({ delete: () => {} }) },
    '@/lib/auth/session': { getCurrentUser: async () => null },
    '@/lib/auth/redirects': { safeInternalRedirect: (p) => p || '/dashboard' },
    '@/lib/actions/billing': { subscriptionCheckout: async () => ({ ok: true }) },
    '@/lib/auth/plan': { subscriptionCheckout: async () => ({ ok: true }) },
    '@/lib/constants/plans': { SELLABLE_PLANS: [] },
    '@/lib/security/rate-limit': { rateLimit: async () => ({ ok: true }), clientIp: async () => '127.0.0.1' },
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: { resetPasswordForEmail: async () => ({ data: {}, error: null }) },
      }),
      createAdminClient: async () => ({}),
    },
  })

  // E-mail inválido -> fieldError
  const invalidForm = new FormData()
  invalidForm.set('email', 'not-an-email')
  const resInvalid = await requestPasswordReset({ ok: false }, invalidForm)
  assert.equal(resInvalid.ok, false)
  assert.equal(resInvalid.fieldErrors?.email, 'E-mail inválido')

  // E-mail válido -> sucesso neutro
  const validForm = new FormData()
  validForm.set('email', 'usuario@valido.com')
  const resValid = await requestPasswordReset({ ok: false }, validForm)
  assert.equal(resValid.ok, true)
})
