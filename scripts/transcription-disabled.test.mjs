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

test('card #66: transcription feature flag is disabled by default', () => {
  const { TRANSCRIPTION_ENABLED } = load('../lib/constants/transcription.ts')
  assert.equal(TRANSCRIPTION_ENABLED, false, 'TRANSCRIPTION_ENABLED must be false')
})

test('card #66: no user role has transcription navigation entry points', () => {
  const { TRANSCRIPTION_ENABLED } = load('../lib/constants/transcription.ts')
  const { NAV_BY_ROLE } = load('../lib/constants/nav.ts', {
    '@/lib/constants/transcription': { TRANSCRIPTION_ENABLED },
  })

  for (const [role, items] of Object.entries(NAV_BY_ROLE)) {
    const hasTranscription = items.some(
      (item) => item.href.includes('/transcribe') || item.label.toLowerCase().includes('transcri'),
    )
    assert.equal(
      hasTranscription,
      false,
      `Role ${role} must not have transcription navigation entry points`,
    )
  }
})

test('card #66: upgrade page feature list does not advertise transcription when disabled', () => {
  const { TRANSCRIPTION_ENABLED } = load('../lib/constants/transcription.ts')
  const TRANSCRIPTION_LINE = 'Transcrição de cifra por IA'
  const ALL_FEATURE_LINES = {
    professional: ['Alunos e professores ilimitados', 'Financeiro completo', 'Relatórios completos'],
    premium: ['Tudo do Profissional', TRANSCRIPTION_LINE, 'Marca personalizada (logo e cores)'],
    solo: ['Feito para 1 professor só', 'Alunos ilimitados', 'Financeiro completo'],
    solo_pro: ['Tudo do Solo', 'Relatórios de desempenho', TRANSCRIPTION_LINE],
  }

  const featureLines = Object.fromEntries(
    Object.entries(ALL_FEATURE_LINES).map(([plan, lines]) => [
      plan,
      TRANSCRIPTION_ENABLED ? lines : lines.filter((line) => line !== TRANSCRIPTION_LINE),
    ]),
  )

  for (const [plan, lines] of Object.entries(featureLines)) {
    assert.equal(
      lines.includes(TRANSCRIPTION_LINE),
      false,
      `Plan ${plan} must not advertise transcription when flag is false`,
    )
  }
})

test('card #66: transcription server actions fail closed when flag is false', async () => {
  const { TRANSCRIPTION_ENABLED } = load('../lib/constants/transcription.ts')
  const { createTranscription } = load('../lib/actions/transcription.ts', {
    'server-only': {},
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/constants/transcription': { TRANSCRIPTION_ENABLED, AUDIO_ACCEPT: 'audio/*', AUDIO_MAX_BYTES: 25000000, TRANSCRIPTION_MONTHLY_CAP: 100 },
    '@/lib/supabase/server': { createClient: async () => ({}), createAdminClient: async () => ({}) },
    '@/lib/auth/plan': { transcriptionAccess: async () => 'ok' },
    '@/lib/constants/resources': { CATEGORIES: [], DIFFICULTIES: [] },
    '@/lib/storage/audio': {},
    '@/lib/transcription': {},
    '@/lib/transcription/process': {},
  })

  const res = await createTranscription({ ok: false }, new FormData())
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Acesso negado.')
})
