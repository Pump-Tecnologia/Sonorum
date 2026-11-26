// Regressão local sem rede: valida regras de segurança do webhook Asaas e conciliação de pagamentos.
// Rode com: node --test scripts/asaas-reconcile.test.mjs
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
    require: (id) => (id in mocks ? mocks[id] : require(id)),
  })
  return exports
}

test('webhook Asaas em produção exige ASAAS_WEBHOOK_TOKEN configurado', async () => {
  const origEnv = process.env.NODE_ENV
  const origToken = process.env.ASAAS_WEBHOOK_TOKEN
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.ASAAS_WEBHOOK_TOKEN
    delete process.env.VERCEL_ENV

    const { POST } = load('../app/api/webhooks/asaas/route.ts', {
      'next/server': {
        NextResponse: {
          json: (data, opts) => ({ status: opts?.status ?? 200, data }),
        },
      },
      '@/lib/security/rate-limit': { clientIp: async () => '127.0.0.1', rateLimit: async () => ({ ok: true }) },
      '@/lib/security/compare': { safeEqual: () => true },
      '@/lib/payments/reconcile': { reconcilePayment: async () => ({}), reconcileSubscription: async () => ({}), reconcileStudentCharge: async () => ({}) },
    })

    const req = {
      headers: new Map(),
      json: async () => ({ event: 'PAYMENT_CONFIRMED' }),
    }
    const res = await POST(req)
    assert.equal(res.status, 503)
    assert.match(res.data.error, /webhook authentication is not configured/)
  } finally {
    process.env.NODE_ENV = origEnv
    if (origToken) process.env.ASAAS_WEBHOOK_TOKEN = origToken
  }
})

test('webhook Asaas rejeita requisição com token incorreto', async () => {
  const origToken = process.env.ASAAS_WEBHOOK_TOKEN
  try {
    process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token-123'

    const { POST } = load('../app/api/webhooks/asaas/route.ts', {
      'next/server': {
        NextResponse: {
          json: (data, opts) => ({ status: opts?.status ?? 200, data }),
        },
      },
      '@/lib/security/rate-limit': { clientIp: async () => '127.0.0.1', rateLimit: async () => ({ ok: true }) },
      '@/lib/security/compare': { safeEqual: (a, b) => a === b },
      '@/lib/payments/reconcile': { reconcilePayment: async () => ({}), reconcileSubscription: async () => ({}), reconcileStudentCharge: async () => ({}) },
    })

    const req = {
      headers: new Map([['asaas-access-token', 'wrong-token']]),
      json: async () => ({ event: 'PAYMENT_CONFIRMED' }),
    }
    const res = await POST(req)
    assert.equal(res.status, 401)
    assert.equal(res.data.error, 'invalid token')
  } finally {
    if (origToken) process.env.ASAAS_WEBHOOK_TOKEN = origToken
  }
})

test('reconcilePayment recusa ativação quando o valor do gateway diverge do checkout (amount_mismatch)', async () => {
  const { reconcilePayment } = load('../lib/payments/reconcile.ts', {
    'server-only': {},
    '@/lib/timezone': { dateInBR: () => '2026-11-10' },
    '@/lib/notifications/notify': { notify: async () => {} },
    '@/lib/payments': {
      getPaymentProvider: () => ({
        name: 'asaas',
        getPayment: async () => ({
          paymentId: 'pay_123',
          status: 'approved',
          amount: 50.00, // Gateway diz R$ 50,00
          externalReference: 'ref-1',
        }),
      }),
    },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'sp_1',
                  school_id: 'school_1',
                  status: 'pending',
                  amount: 100.00, // Checkout esperava R$ 100,00!
                  provider: 'asaas',
                  plan_type: 'professional',
                },
              }),
            }),
          }),
        }),
      }),
    },
  })

  const res = await reconcilePayment('pay_123')
  assert.equal(res.handled, false)
  assert.equal(res.status, 'amount_mismatch')
})

test('reconcileStudentCharge dá baixa automática em charges e dispara notificação', async () => {
  let updatedCharge = null
  let notifiedEvent = null

  const { reconcileStudentCharge } = load('../lib/payments/reconcile.ts', {
    'server-only': {},
    '@/lib/timezone': { dateInBR: () => '2026-11-10' },
    '@/lib/notifications/notify': { notify: async () => {} },
    '@/lib/payments': { getPaymentProvider: () => ({ name: 'asaas' }) },
    '@/lib/notifications/notify': {
      notify: async (event, studentId, payload, options) => {
        notifiedEvent = { event, studentId, payload, options }
      },
    },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => {
          if (table === 'charges') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'charge-uuid-1',
                      amount: 250.0,
                      status: 'pending',
                      student_id: 'student-uuid-1',
                      school_id: 'school-uuid-1',
                    },
                  }),
                }),
                or: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'charge-uuid-1',
                      amount: 250.0,
                      status: 'pending',
                      student_id: 'student-uuid-1',
                      school_id: 'school-uuid-1',
                    },
                  }),
                }),
              }),
              update: (fields) => ({
                eq: (_col, val) => {
                  updatedCharge = { id: val, ...fields }
                  return Promise.resolve({ error: null })
                },
              }),
            }
          }
          return {}
        },
      }),
    },
  })

  const res = await reconcileStudentCharge('pay_asaas_999', 'PAYMENT_RECEIVED', {
    value: 250.0,
    billingType: 'PIX',
    externalReference: 'charge-uuid-1',
  })

  assert.equal(res.handled, true)
  assert.equal(res.status, 'paid')
  assert.equal(updatedCharge.status, 'paid')
  assert.equal(updatedCharge.payment_method, 'pix')
  assert.equal(updatedCharge.asaas_charge_id, 'pay_asaas_999')
  assert.equal(notifiedEvent.event, 'charge.paid')
  assert.equal(notifiedEvent.studentId, 'student-uuid-1')
  assert.equal(notifiedEvent.options.schoolId, 'school-uuid-1')
})

