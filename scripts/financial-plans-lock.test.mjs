// Regressão local: valida o bloqueio do módulo financeiro em planos gratuitos,
// o período de carência de 5 dias e a transição de permissões após expiração.
// Rode com: node --test scripts/financial-plans-lock.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function load(path, mocks = {}) {
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

test('planos gratuitos (Essencial e Solo Essencial) não oferecem o módulo financeiro', () => {
  const { PLAN_FEATURES } = load('../lib/constants/plans.ts')

  // Gratuitos sem financeiro
  assert.equal(PLAN_FEATURES.free.financial, false, 'Essencial (free) deve ter financial: false')
  assert.equal(PLAN_FEATURES.solo_free.financial, false, 'Solo Essencial (solo_free) deve ter financial: false')

  // Pagos com financeiro liberado
  assert.equal(PLAN_FEATURES.solo.financial, true, 'Solo deve ter financial: true')
  assert.equal(PLAN_FEATURES.solo_pro.financial, true, 'Solo Pro deve ter financial: true')
  assert.equal(PLAN_FEATURES.professional.financial, true, 'Profissional deve ter financial: true')
  assert.equal(PLAN_FEATURES.premium.financial, true, 'Premium deve ter financial: true')
})

test('utilitários de timezone para carência calculam datas e deltas corretamente', () => {
  const { addDaysToBRDate, diffInBRDays } = load('../lib/timezone.ts')

  assert.equal(addDaysToBRDate('2026-11-10', 5), '2026-11-15')
  assert.equal(addDaysToBRDate('2026-11-28', 5), '2026-12-03') // virada de mês
  assert.equal(diffInBRDays('2026-11-10', '2026-11-15'), 5)
  assert.equal(diffInBRDays('2026-11-15', '2026-11-10'), -5)
  assert.equal(diffInBRDays('2026-11-11', '2026-11-15'), 4)
})

test('período de carência de 5 dias: isPlanInGracePeriod e graceDaysRemaining', () => {
  const timezone = load('../lib/timezone.ts')
  const planAuth = load('../lib/auth/plan.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => null },
    '@/lib/constants/plans': load('../lib/constants/plans.ts'),
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/timezone': timezone,
    'next/navigation': { redirect: () => {} },
  })

  const { isPlanInGracePeriod, graceDaysRemaining, isPlanGraceExpired, GRACE_PERIOD_DAYS }
    = planAuth

  assert.equal(GRACE_PERIOD_DAYS, 5)

  const expiration = '2026-11-10'

  // Dia 2026-11-10: ainda válido (não expirou)
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-10'), false)
  assert.equal(graceDaysRemaining(expiration, '2026-11-10'), 0)
  assert.equal(isPlanGraceExpired(expiration, '2026-11-10'), false)

  // Dia 1 de carência (2026-11-11):
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-11'), true)
  assert.equal(graceDaysRemaining(expiration, '2026-11-11'), 5)
  assert.equal(isPlanGraceExpired(expiration, '2026-11-11'), false)

  // Dia 2 de carência (2026-11-12):
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-12'), true)
  assert.equal(graceDaysRemaining(expiration, '2026-11-12'), 4)

  // Dia 3 de carência (2026-11-13):
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-13'), true)
  assert.equal(graceDaysRemaining(expiration, '2026-11-13'), 3)

  // Dia 4 de carência (2026-11-14):
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-14'), true)
  assert.equal(graceDaysRemaining(expiration, '2026-11-14'), 2)

  // Dia 5 de carência (2026-11-15, último dia de carência):
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-15'), true)
  assert.equal(graceDaysRemaining(expiration, '2026-11-15'), 1)
  assert.equal(isPlanGraceExpired(expiration, '2026-11-15'), false)

  // Dia 6 (2026-11-16): carência encerrada, serviços bloqueados!
  assert.equal(isPlanInGracePeriod(expiration, '2026-11-16'), false)
  assert.equal(graceDaysRemaining(expiration, '2026-11-16'), 0)
  assert.equal(isPlanGraceExpired(expiration, '2026-11-16'), true)
})

test('effectivePlanFeatures preserva recursos durante a carência e bloqueia após expirar', () => {
  const timezone = load('../lib/timezone.ts')
  const planAuth = load('../lib/auth/plan.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => null },
    '@/lib/constants/plans': load('../lib/constants/plans.ts'),
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/timezone': timezone,
    'next/navigation': { redirect: () => {} },
  })

  const { effectivePlanFeatures } = planAuth
  const expiration = '2026-11-10'

  // Plano Profissional enquanto válido: financeiro = true
  const activeFeatures = effectivePlanFeatures('professional', expiration, null, '2026-11-10')
  assert.equal(activeFeatures.financial, true)
  assert.equal(activeFeatures.reports, true)

  // Durante a carência de 5 dias (ex: 2026-11-13): financeiro = true mantido!
  const graceFeatures = effectivePlanFeatures('professional', expiration, null, '2026-11-13')
  assert.equal(graceFeatures.financial, true, 'Recursos devem ser mantidos durante carência')
  assert.equal(graceFeatures.reports, true)

  // Após encerrar a carência (2026-11-16): rebaixa para o gratuito equivalente ('free')
  const expiredFeatures = effectivePlanFeatures('professional', expiration, null, '2026-11-16')
  assert.equal(expiredFeatures.financial, false, 'Financeiro bloqueado após encerramento da carência')
  assert.equal(expiredFeatures.reports, false)
  assert.equal(expiredFeatures.label, 'Essencial')

  // Para conta Solo: rebaixa para 'solo_free'
  const soloGrace = effectivePlanFeatures('solo', expiration, null, '2026-11-12')
  assert.equal(soloGrace.financial, true, 'Solo mantém financeiro durante carência')

  const soloExpired = effectivePlanFeatures('solo', expiration, null, '2026-11-16')
  assert.equal(soloExpired.financial, false, 'Solo rebaixado para solo_free sem financeiro')
  assert.equal(soloExpired.label, 'Solo Essencial')
})

test('enrollStudent e createPlan recusam quando financial é false', async () => {
  const { enrollStudent } = load('../lib/actions/enrollments.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: false } }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
  })

  const res = await enrollStudent({ ok: false }, new FormData())
  assert.equal(res.ok, false)
  assert.match(res.error, /planos pagos|indisponível/i)

  const { createPlan } = load('../lib/actions/plans.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { financial: false } }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
  })

  const planRes = await createPlan({ ok: false }, new FormData())
  assert.equal(planRes.ok, false)
  assert.match(planRes.error, /planos pagos|Acesso negado/i)
})
