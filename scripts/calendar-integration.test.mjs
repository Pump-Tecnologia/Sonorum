// Regressão local sem rede: valida regras de integração e criptografia do Google Calendar.
// Rode com: node --test scripts/calendar-integration.test.mjs
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
    Buffer,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto,
    require: (id) => (id in mocks ? mocks[id] : require(id)),
  })
  return exports
}

test('isGoogleCalendarEnabled detecta corretamente a presença das credenciais', () => {
  const origId = process.env.GOOGLE_CLIENT_ID
  const origSec = process.env.GOOGLE_CLIENT_SECRET
  const origKey = process.env.CALENDAR_ENC_KEY
  const origProv = process.env.GOOGLE_CALENDAR_PROVIDER

  try {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.CALENDAR_ENC_KEY

    const { isGoogleCalendarEnabled, getCalendarProvider } = load('../lib/calendar/index.ts', {
      'server-only': {},
      '@/lib/calendar/google': { googleCalendarProvider: () => ({ name: 'google' }) },
      '@/lib/calendar/mock': { mockCalendarProvider: () => ({ name: 'mock' }) },
      '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    })

    assert.equal(isGoogleCalendarEnabled(), false)
    assert.equal(getCalendarProvider().name, 'mock')

    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    process.env.CALENDAR_ENC_KEY = Buffer.alloc(32).toString('base64')

    assert.equal(isGoogleCalendarEnabled(), true)
    assert.equal(getCalendarProvider().name, 'google')
  } finally {
    if (origId) process.env.GOOGLE_CLIENT_ID = origId
    if (origSec) process.env.GOOGLE_CLIENT_SECRET = origSec
    if (origKey) process.env.CALENDAR_ENC_KEY = origKey
    if (origProv) process.env.GOOGLE_CALENDAR_PROVIDER = origProv
  }
})

test('googleAuthUrl gera URL de consentimento com offline access e escopo correto', () => {
  const origId = process.env.GOOGLE_CLIENT_ID
  try {
    process.env.GOOGLE_CLIENT_ID = 'my-client-id'
    const { googleAuthUrl } = load('../lib/calendar/index.ts', {
      'server-only': {},
      '@/lib/calendar/google': { googleCalendarProvider: () => ({ name: 'google' }) },
      '@/lib/calendar/mock': { mockCalendarProvider: () => ({ name: 'mock' }) },
      '@/lib/payments': { appBaseUrl: () => 'https://app.sonorum.com.br' },
    })

    const urlStr = googleAuthUrl('state-123')
    const url = new URL(urlStr)
    assert.equal(url.searchParams.get('client_id'), 'my-client-id')
    assert.equal(url.searchParams.get('access_type'), 'offline')
    assert.equal(url.searchParams.get('prompt'), 'consent')
    assert.equal(url.searchParams.get('state'), 'state-123')
    assert.match(url.searchParams.get('scope') ?? '', /calendar\.events/)
  } finally {
    if (origId) process.env.GOOGLE_CLIENT_ID = origId
  }
})

test('encryptToken e decryptToken preservam o segredo com integridade AES-256-GCM', async () => {
  const origKey = process.env.CALENDAR_ENC_KEY
  try {
    // 32 bytes random key in base64
    const keyBytes = crypto.getRandomValues(new Uint8Array(32))
    process.env.CALENDAR_ENC_KEY = Buffer.from(keyBytes).toString('base64')

    const { encryptToken, decryptToken } = load('../lib/calendar/crypto.ts', {
      'server-only': {},
    })

    const plain = '1//04test_refresh_token_xyz_abc123'
    const encrypted = await encryptToken(plain)
    assert.notEqual(encrypted, plain)
    assert.ok(encrypted.includes('.'))

    const decrypted = await decryptToken(encrypted)
    assert.equal(decrypted, plain)
  } finally {
    if (origKey) process.env.CALENDAR_ENC_KEY = origKey
  }
})
