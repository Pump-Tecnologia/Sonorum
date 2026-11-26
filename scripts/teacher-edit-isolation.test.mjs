// Regressão local sem rede: executa página/action reais com dependências isoladas.
// Rode com: node --test scripts/teacher-edit-isolation.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const denied = () => { throw new Error('NOT_FOUND') }

function load(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: (id) => id in mocks ? mocks[id] : require(id),
  })
  return exports
}

function teacherQuery(targetSchool) {
  const filters = new Map()
  const row = { id: 'teacher-id', user_id: 'user-id', school_id: targetSchool, users: { name: 'Professor QA', email: 'qa@sonorum.test' }, instruments: [] }
  const query = {
    select: () => query,
    eq: (key, value) => { filters.set(key, value); return query },
    maybeSingle: async () => ({ data: filters.get('school_id') === targetSchool ? row : null }),
    single: async () => ({ data: filters.get('school_id') === targetSchool ? row : null }),
  }
  return { query, filters }
}

function pageFor(me, targetSchool = 'school-a', solo = false) {
  const { query } = teacherQuery(targetSchool)
  return load('../app/(app)/admin/teachers/[id]/edit/page.tsx', {
    'next/navigation': { notFound: denied, redirect: (url) => { throw new Error(`REDIRECT:${url}`) } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/components/app/PageHeader': { PageHeader: 'header' },
    '@/components/admin/EditTeacherForm': { EditTeacherForm: 'form' },
    '@/lib/auth/plan': { getPlanContext: async () => ({}), isSoloExperience: () => solo },
    '@/lib/auth/session': { getCurrentUser: async () => me },
    '@/lib/supabase/server': {
      createClient: async () => ({ from: () => query }),
      createAdminClient: () => { throw new Error('Page must not bypass RLS') },
    },
  }).default
}

test('admin da própria escola recebe formulário com dados do professor', async () => {
  const result = await pageFor({ role: 'admin', schoolId: 'school-a' })({ params: Promise.resolve({ id: 'teacher-id' }) })
  assert.equal(result.props.children[1].props.teacher.name, 'Professor QA')
})

test('admin não carrega professor de outra escola', async () => {
  await assert.rejects(pageFor({ role: 'admin', schoolId: 'school-a' }, 'school-b')({ params: Promise.resolve({ id: 'teacher-id' }) }), /NOT_FOUND/)
})

for (const [label, me] of [
  ['sem sessão', null],
  ['sem escola', { role: 'admin', schoolId: null }],
  ['professor', { role: 'teacher', schoolId: 'school-a' }],
  ['aluno', { role: 'student', schoolId: 'school-a' }],
]) {
  test(`${label} não acessa página de edição administrativa`, async () => {
    await assert.rejects(pageFor(me)({ params: Promise.resolve({ id: 'teacher-id' }) }), /NOT_FOUND/)
  })
}

test('conta solo mantém edição pelo perfil', async () => {
  await assert.rejects(pageFor({ role: 'admin', schoolId: 'school-a' }, 'school-a', true)({ params: Promise.resolve({ id: 'teacher-id' }) }), /REDIRECT:\/profile/)
})

test('action rejeita teacherId de outra escola antes de atualizar acesso ou perfil', async () => {
  const { query } = teacherQuery('school-b')
  let authWrites = 0
  const { updateTeacher } = load('../lib/actions/update-user.ts', {
    'next/cache': { revalidatePath: () => assert.fail('Não deve revalidar alteração recusada') },
    'next/navigation': { redirect: () => assert.fail('Não deve redirecionar como sucesso') },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-a' }) },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: () => query,
        auth: { admin: { updateUserById: () => { authWrites++; assert.fail('Não deve alterar Auth de outra escola') } } },
      }),
    },
  })
  const form = new FormData()
  for (const [key, value] of Object.entries({ teacherId: 'teacher-id', name: 'Tentativa QA', email: 'qa@sonorum.test' })) form.set(key, value)
  const result = await updateTeacher({ ok: false }, form)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'Professor não encontrado.')
  assert.equal(authWrites, 0)
})
