// Regressão local sem rede: valida regras de criação/edição e preservação dos formulários.
// Rode com: node --test scripts/person-forms.test.mjs
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

test('createStudent recusa usuário sem escola ou que não é admin', async () => {
  const { createStudent } = load('../lib/actions/students.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-1' }) },
    '@/lib/supabase/server': { createAdminClient: async () => ({}) },
    '@/lib/auth/plan': { effectivePlanFeatures: () => ({}) },
    '@/lib/queries/teachers': { isActiveTeacherOfSchool: async () => true },
    '@/lib/notifications/credentials': { sendCredentialsEmail: async () => ({ ok: true }) },
    '@/lib/users/admin': { createUserWithProfile: async () => ({ ok: true, userId: 'u1' }), generatePassword: () => 'pass' },
  })
  const res = await createStudent({ ok: false }, new FormData())
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Acesso negado.')
})

test('createStudent bloqueia criação quando cota de alunos do plano é atingida', async () => {
  const { createStudent } = load('../lib/actions/students.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => {
          if (table === 'schools') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { plan_type: 'essencial', feature_overrides: null, expiration_date: null } }),
                }),
              }),
            }
          }
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  eq: async () => ({ count: 5 }),
                }),
              }),
            }
          }
          return {}
        },
      }),
    },
    '@/lib/auth/plan': {
      effectivePlanFeatures: () => ({ studentLimit: 5, label: 'Essencial' }),
    },
    '@/lib/queries/teachers': { isActiveTeacherOfSchool: async () => true },
    '@/lib/notifications/credentials': { sendCredentialsEmail: async () => ({ ok: true }) },
    '@/lib/users/admin': { createUserWithProfile: async () => ({ ok: true, userId: 'u1' }), generatePassword: () => 'pass' },
  })

  const form = new FormData()
  form.set('name', 'Aluno Teste')
  form.set('email', 'aluno@teste.com')
  const res = await createStudent({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.match(res.error, /Limite de 5 alunos atingido/)
})

test('createTeacher bloqueia criação quando cota de professores do plano é atingida', async () => {
  const { createTeacher } = load('../lib/actions/teachers.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: (table) => {
          if (table === 'schools') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { plan_type: 'essencial', feature_overrides: null, expiration_date: null } }),
                }),
              }),
            }
          }
          if (table === 'teachers') {
            return {
              select: () => ({
                eq: async () => ({ count: 1 }),
              }),
            }
          }
          return {}
        },
      }),
    },
    '@/lib/auth/plan': {
      effectivePlanFeatures: () => ({ teacherLimit: 1, label: 'Essencial' }),
    },
    '@/lib/notifications/credentials': { sendCredentialsEmail: async () => ({ ok: true }) },
    '@/lib/users/admin': { createUserWithProfile: async () => ({ ok: true, userId: 'u1' }), generatePassword: () => 'pass' },
  })

  const form = new FormData()
  form.set('name', 'Professor Teste')
  form.set('email', 'prof@teste.com')
  const res = await createTeacher({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.match(res.error, /Limite de 1 professor\(es\)/)
})

test('formulários de pessoa e importação registram cancelamento de reset automático', () => {
  const files = [
    '../components/admin/CreateStudentForm.tsx',
    '../components/admin/CreateTeacherForm.tsx',
    '../components/admin/EditStudentForm.tsx',
    '../components/admin/EditTeacherForm.tsx',
    '../components/admin/ImportForm.tsx',
  ]

  for (const f of files) {
    const content = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.match(content, /onReset=\{[^}]*preventDefault\(\)/, `${f} deve conter onReset com preventDefault`)
  }
})
