// Regressão local sem rede: o que usuários digitam não pode virar HTML no e-mail.
// Rode com: node --test scripts/email-templates.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

// Carrega o módulo real e, junto, os módulos do projeto que ele importar.
function load(file) {
  const code = ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: (id) => (id.startsWith('@/') ? load(`../${id.slice(2)}.ts`) : require(id)) })
  return exports
}

const { TEMPLATES } = load('../lib/notifications/templates.ts')

// Toda chave que algum template lê. Um campo novo entra no teste sozinho.
const PAYLOAD_KEYS = [...new Set([...source('../lib/notifications/templates.ts').matchAll(/\bp\.(\w+)/g)].map((m) => m[1]))]

const hostile = (key) => `<x-${key} a="'&">`
const hostilePayload = Object.fromEntries(PAYLOAD_KEYS.map((key) => [key, hostile(key)]))

for (const [event, template] of Object.entries(TEMPLATES)) {
  test(`${event}: HTML escapa o que veio do usuário`, () => {
    const { html } = template.email(hostilePayload)

    assert.equal(html.includes('<x-'), false, html.slice(html.indexOf('<x-'), html.indexOf('<x-') + 60))
    assert.ok(html.includes('&lt;x-recipientName a=&quot;&#39;&amp;&quot;&gt;'))
  })

  test(`${event}: texto, assunto e WhatsApp seguem com o valor original`, () => {
    const { text } = template.email(hostilePayload)
    const plain = [text, template.subject(hostilePayload), template.whatsapp(hostilePayload)]

    for (const output of plain) assert.equal(/&(lt|gt|quot|amp|#39);/.test(output), false, output)
    assert.ok(text.includes(hostile('recipientName')))
  })
}

test('link e logo não escapam do atributo HTML', () => {
  const payUrl = 'https://app.test/pagar/1?a=1&b=2"><script>alert(1)</script>'
  const logoUrl = 'https://app.test/logo.png" onerror="alert(1)'

  const { html, text } = TEMPLATES['charge.created'].email({ payUrl, logoUrl, amount: 10 })

  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('" onerror="'), false)
  assert.ok(html.includes('href="https://app.test/pagar/1?a=1&amp;b=2&quot;&gt;&lt;script&gt;'))
  assert.ok(html.includes('src="https://app.test/logo.png&quot; onerror=&quot;alert(1)"'))
  assert.ok(text.includes(payUrl))
})

test('relatório com valores comuns continua legível', () => {
  const { html } = TEMPLATES['lesson.report'].email({
    recipientName: 'Ana', notes: 'Boa aula, revisar a escala.', technique: 4, theory: 0,
    reportUrl: 'https://app.test/relatorio/1',
  })

  assert.ok(html.includes('Olá, Ana'))
  assert.ok(html.includes('Boa aula, revisar a escala.'))
  assert.ok(html.includes('Técnica: <strong>4/5</strong>'))
  assert.ok(html.includes('Teoria: <strong>0/5</strong>'))
  assert.ok(html.includes('href="https://app.test/relatorio/1"'))
})
