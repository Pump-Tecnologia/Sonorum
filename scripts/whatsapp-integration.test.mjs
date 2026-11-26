// Regressão local sem rede: valida regras de integração e geração de links de WhatsApp.
// Rode com: node --test scripts/whatsapp-integration.test.mjs
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

test('normalizePhone formata corretamente números com DDD e código do país', () => {
  const { normalizePhone } = load('../lib/notifications/whatsapp.ts', {})
  assert.equal(normalizePhone('11999998888'), '5511999998888')
  assert.equal(normalizePhone('(11) 99999-8888'), '5511999998888')
  assert.equal(normalizePhone('+55 11 99999-8888'), '5511999998888')
  assert.equal(normalizePhone(null), null)
  assert.equal(normalizePhone('123'), null)
})

test('waLink gera link wa.me válido com texto codificado', () => {
  const { waLink } = load('../lib/notifications/whatsapp.ts', {})
  const url = waLink('(11) 99999-8888', 'Olá, sua aula foi agendada!')
  assert.ok(url)
  assert.match(url, /^https:\/\/wa\.me\/5511999998888\?text=Ol%C3%A1/)
  assert.equal(waLink(null, 'teste'), null)
})

test('whatsapp-cloud opera em fallback manual gracioso sem credenciais Meta', () => {
  const originalToken = process.env.WHATSAPP_CLOUD_TOKEN
  const originalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  try {
    delete process.env.WHATSAPP_CLOUD_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID

    const { isWhatsAppCloudEnabled, getWhatsAppProvider } = load('../lib/notifications/whatsapp-cloud.ts', {
      'server-only': {},
      '@/lib/notifications/whatsapp': {
        normalizePhone: (p) => (p ? '55' + p.replace(/\D/g, '') : null),
      },
    })

    assert.equal(isWhatsAppCloudEnabled(), false)
    const provider = getWhatsAppProvider()
    assert.equal(provider.name, 'manual')
  } finally {
    if (originalToken) process.env.WHATSAPP_CLOUD_TOKEN = originalToken
    if (originalPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneId
  }
})
