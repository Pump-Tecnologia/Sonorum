// Regressão local sem rede: valida regras de integração e despacho de e-mails.
// Rode com: node --test scripts/email-integration.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function load(path, mocks, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    process,
    require: (id) => (id in mocks ? mocks[id] : require(id)),
    ...globals,
  })
  return exports
}

test('sendEmail em produção falha fechado se RESEND_API_KEY não estiver configurada', async () => {
  const originalEnv = process.env.NODE_ENV
  const originalKey = process.env.RESEND_API_KEY
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.RESEND_API_KEY

    const { sendEmail } = load('../lib/notifications/email.ts', {})
    const res = await sendEmail({
      to: 'teste@sonorum.test',
      subject: 'Teste',
      html: '<p>Teste</p>',
      text: 'Teste',
    })
    assert.equal(res.ok, false)
    assert.match(res.error, /RESEND_API_KEY não está configurada/)
  } finally {
    process.env.NODE_ENV = originalEnv
    if (originalKey) process.env.RESEND_API_KEY = originalKey
  }
})

test('sendEmail em modo de desenvolvimento opera em mock seguro quando sem chave', async () => {
  const originalEnv = process.env.NODE_ENV
  const originalKey = process.env.RESEND_API_KEY
  try {
    process.env.NODE_ENV = 'development'
    delete process.env.RESEND_API_KEY

    const { sendEmail } = load('../lib/notifications/email.ts', {})
    const res = await sendEmail({
      to: 'teste@sonorum.test',
      subject: 'Teste Dev',
      html: '<p>Teste Dev</p>',
      text: 'Teste Dev',
    })
    assert.equal(res.ok, true)
  } finally {
    process.env.NODE_ENV = originalEnv
    if (originalKey) process.env.RESEND_API_KEY = originalKey
  }
})

test('notify silencia e-mail se aluno estiver com notify_email desativado', async () => {
  const logs = []
  const { notify } = load('../lib/notifications/notify.ts', {
    'server-only': {},
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'student-1',
                      name: 'Aluno QA',
                      email: 'aluno@sonorum.test',
                      phone: '11999999999',
                      parent_contact: null,
                      notify_to: 'student',
                      notify_email: false, // DESATIVADO
                      school_id: 'school-1',
                      schools: { name: 'Escola QA', custom_name: null, brand_primary: null, logo_path: null, plan_type: 'essencial', feature_overrides: null, expiration_date: null },
                    },
                  }),
                }),
              }),
            }
          }
          if (table === 'notifications') {
            return {
              insert: async (rows) => {
                logs.push(...rows)
                return { error: null }
              },
            }
          }
          return {}
        },
      }),
    },
    '@/lib/auth/plan': { effectivePlanFeatures: () => ({ whatsappOfficial: false }) },
    '@/lib/notifications/email': { sendEmail: async () => ({ ok: true }) },
    '@/lib/notifications/templates': {
      TEMPLATES: {
        'lesson.scheduled': {
          subject: () => 'Aula',
          email: () => ({ html: '<p>Aula</p>', text: 'Aula' }),
          whatsapp: () => 'Aula wa',
        },
      },
    },
    '@/lib/notifications/whatsapp': { waLink: () => 'https://wa.me/...' },
    '@/lib/notifications/whatsapp-cloud': { isWhatsAppCloudEnabled: () => false, getWhatsAppProvider: () => null },
    '@/lib/notifications/whatsapp-templates': { WHATSAPP_TEMPLATES: {} },
  })

  const res = await notify('lesson.scheduled', 'student-1', { date: '10/11/2026', time: '10:00' }, { schoolId: 'school-1' })
  assert.equal(res.email.skipped, 1)
  assert.equal(res.email.sent, 0)
  const emailLog = logs.find((l) => l.channel === 'email')
  assert.ok(emailLog)
  assert.equal(emailLog.status, 'skipped')
  assert.equal(emailLog.error, 'e-mail desativado pelo aluno')
})

test('notify envia e-mail e grava log quando notify_email está ativo', async () => {
  const logs = []
  let emailSentTo = null
  const { notify } = load('../lib/notifications/notify.ts', {
    'server-only': {},
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'student-2',
                      name: 'Aluno QA 2',
                      email: 'aluno2@sonorum.test',
                      phone: '11999999999',
                      parent_contact: null,
                      notify_to: 'student',
                      notify_email: true, // ATIVADO
                      school_id: 'school-1',
                      schools: { name: 'Escola QA', custom_name: null, brand_primary: null, logo_path: null, plan_type: 'essencial', feature_overrides: null, expiration_date: null },
                    },
                  }),
                }),
              }),
            }
          }
          if (table === 'notifications') {
            return {
              insert: async (rows) => {
                logs.push(...rows)
                return { error: null }
              },
            }
          }
          return {}
        },
      }),
    },
    '@/lib/auth/plan': { effectivePlanFeatures: () => ({ whatsappOfficial: false }) },
    '@/lib/notifications/email': {
      sendEmail: async ({ to }) => {
        emailSentTo = to
        return { ok: true }
      },
    },
    '@/lib/notifications/templates': {
      TEMPLATES: {
        'lesson.scheduled': {
          subject: () => 'Aula Agendada',
          email: () => ({ html: '<p>Aula</p>', text: 'Aula' }),
          whatsapp: () => 'Aula wa',
        },
      },
    },
    '@/lib/notifications/whatsapp': { waLink: () => 'https://wa.me/...' },
    '@/lib/notifications/whatsapp-cloud': { isWhatsAppCloudEnabled: () => false, getWhatsAppProvider: () => null },
    '@/lib/notifications/whatsapp-templates': { WHATSAPP_TEMPLATES: {} },
  })

  const res = await notify('lesson.scheduled', 'student-2', { date: '10/11/2026', time: '10:00' }, { schoolId: 'school-1' })
  assert.equal(res.email.sent, 1)
  assert.equal(emailSentTo, 'aluno2@sonorum.test')
  const emailLog = logs.find((l) => l.channel === 'email')
  assert.ok(emailLog)
  assert.equal(emailLog.status, 'sent')
})

// Aluno com e-mail ligado e responsável cadastrado: se algo vazar, aparece aqui.
function loadNotifyForSchool(studentSchoolId, sent, logs, warnings) {
  const student = {
    id: 'student-3', name: 'Aluno QA 3', email: 'aluno3@sonorum.test', phone: '11999999999',
    parent_contact: 'responsavel@sonorum.test', notify_to: 'both', notify_email: true,
    school_id: studentSchoolId, schools: null,
  }
  return load('../lib/notifications/notify.ts', {
    'server-only': {},
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => table === 'users'
          ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: student }) }) }) }
          : { insert: async (rows) => { logs.push(...rows); return { error: null } } },
      }),
    },
    '@/lib/auth/plan': { effectivePlanFeatures: () => ({ whatsappOfficial: false }) },
    '@/lib/notifications/email': { sendEmail: async ({ to }) => { sent.push(to); return { ok: true } } },
    '@/lib/notifications/templates': {
      TEMPLATES: { 'lesson.scheduled': { subject: () => 'Aula', email: () => ({ html: '', text: '' }), whatsapp: () => 'Aula' } },
    },
    '@/lib/notifications/whatsapp': { waLink: () => 'https://wa.me/5511999999999' },
    '@/lib/notifications/whatsapp-cloud': { isWhatsAppCloudEnabled: () => false, getWhatsAppProvider: () => null },
    '@/lib/notifications/whatsapp-templates': { WHATSAPP_TEMPLATES: {} },
  }, { console: { warn: (...args) => warnings.push(args.join(' ')) } }).notify
}

for (const [caso, escolaDoAluno, escolaDeQuemEnvia] of [
  ['aluno é de outra escola', 'school-b', 'school-a'],
  ['a escola de quem envia não é informada', 'school-a', null],
  ['nem o aluno nem quem envia têm escola', null, null],
]) {
  test(`notify não envia nem registra nada quando ${caso}`, async () => {
    const sent = []
    const logs = []
    const warnings = []
    const notify = loadNotifyForSchool(escolaDoAluno, sent, logs, warnings)

    const res = await notify('lesson.scheduled', 'student-3', {}, { schoolId: escolaDeQuemEnvia })

    assert.deepEqual(sent, [])
    assert.deepEqual(logs, [])
    assert.equal(res.whatsapp.links.length, 0)
    assert.equal(res.email.sent + res.email.skipped + res.email.failed, 0)
    // O bloqueio fica visível no log do servidor, só com identificadores.
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /lesson\.scheduled.*student-3/)
    assert.doesNotMatch(warnings[0], /@|11999999999|Aluno QA/)
  })
}
