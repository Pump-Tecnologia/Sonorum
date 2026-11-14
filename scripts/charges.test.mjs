// Regressão local sem rede: valida regras de criação, cálculo e baixa de cobranças.
// Rode com: node --test scripts/charges.test.mjs
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

test('createCharge recusa usuário que não é admin da escola', async () => {
  const { createCharge } = load('../lib/actions/charges.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: true } }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/finance': { amountForPayment: () => 100 },
    '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    '@/lib/timezone': { brMonthBounds: () => ({}), dateInBR: () => '2026-11-10', isValidCalendarDate: () => true },
    '@/lib/notifications/notify': { notify: async () => {} },
  })

  const form = new FormData()
  form.set('studentId', '00000000-0000-0000-0000-000000000001')
  form.set('dueDate', '2026-11-20')
  const res = await createCharge({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Acesso negado.')
})

test('createCharge recusa aluno de outra escola', async () => {
  const { createCharge } = load('../lib/actions/charges.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: true } }) },
    '@/lib/supabase/server': {
      createClient: async () => ({
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null }), // Não achou na escola do admin
                    }),
                  }),
                }),
              }),
            }
          }
          return {}
        },
      }),
    },
    '@/lib/finance': { amountForPayment: () => 100 },
    '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    '@/lib/timezone': { brMonthBounds: () => ({}), dateInBR: () => '2026-11-10', isValidCalendarDate: () => true },
    '@/lib/notifications/notify': { notify: async () => {} },
  })

  const form = new FormData()
  form.set('studentId', '00000000-0000-0000-0000-000000000002')
  form.set('dueDate', '2026-11-20')
  const res = await createCharge({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.fieldErrors?.studentId, 'Aluno não encontrado nesta escola.')
})

test('createCharge avulsa exige valor positivo maior que zero', async () => {
  const { createCharge } = load('../lib/actions/charges.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: true } }) },
    '@/lib/supabase/server': {
      createClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 's1' } }),
                }),
              }),
            }),
          }),
        }),
      }),
    },
    '@/lib/finance': { amountForPayment: () => 100 },
    '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    '@/lib/timezone': { brMonthBounds: () => ({}), dateInBR: () => '2026-11-10', isValidCalendarDate: () => true },
    '@/lib/notifications/notify': { notify: async () => {} },
  })

  const form = new FormData()
  form.set('avulsa', 'on')
  form.set('studentId', '00000000-0000-0000-0000-000000000001')
  form.set('dueDate', '2026-11-20')
  form.set('amount', '0')
  const res = await createCharge({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.fieldErrors?.amount, 'Informe um valor maior que zero.')
})

test('updateChargeStatus impede reabrir cobrança cancelada', async () => {
  let updated = false
  const { updateChargeStatus } = load('../lib/actions/charges.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: true } }) },
    '@/lib/supabase/server': {
      createClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    status: 'cancelled', // Já está cancelada
                    amount: 200,
                    early_pay_amount: null,
                    due_date: '2026-11-10',
                    enrollment_id: 'enr-1',
                  },
                }),
              }),
            }),
          }),
          update: () => {
            updated = true
            return { eq: () => ({ eq: async () => ({}) }) }
          },
        }),
      }),
    },
    '@/lib/finance': { amountForPayment: () => 200 },
    '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    '@/lib/timezone': { brMonthBounds: () => ({}), dateInBR: () => '2026-11-10', isValidCalendarDate: () => true },
    '@/lib/notifications/notify': { notify: async () => {} },
  })

  const form = new FormData()
  form.set('chargeId', 'charge-1')
  form.set('status', 'paid')
  await updateChargeStatus(form)
  assert.equal(updated, false, 'Não deve atualizar nem reabrir cobrança cancelada')
})
