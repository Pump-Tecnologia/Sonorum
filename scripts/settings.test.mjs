// Regressão local sem rede: valida regras de configurações da escola, branding e salas.
// Rode com: node --test scripts/settings.test.mjs
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
    File,
    FormData,
    require: (id) => (id in mocks ? mocks[id] : require(id)),
  })
  return exports
}

test('updateSchoolSettings recusa quem não é admin', async () => {
  const { updateSchoolSettings } = load('../lib/actions/settings.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: {} }) },
    '@/lib/supabase/server': { createAdminClient: async () => ({}) },
    '@/lib/storage/branding': { uploadSchoolLogo: async () => ({ ok: true }), deleteSchoolLogo: async () => {} },
  })

  const form = new FormData()
  const res = await updateSchoolSettings({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.equal(res.error, 'Acesso negado.')
})

test('updateSchoolSettings valida formato da cor primária', async () => {
  const { updateSchoolSettings } = load('../lib/actions/settings.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { branding: true } }) },
    '@/lib/supabase/server': { createAdminClient: async () => ({}) },
    '@/lib/storage/branding': { uploadSchoolLogo: async () => ({ ok: true }), deleteSchoolLogo: async () => {} },
  })

  const form = new FormData()
  form.set('brandPrimary', 'invalid-color')
  const res = await updateSchoolSettings({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.match(res.fieldErrors?.brandPrimary, /Cor inválida/)
})

test('updateSchoolSettings no plano com branding rejeita nome > 10 caracteres', async () => {
  const { updateSchoolSettings } = load('../lib/actions/settings.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: { branding: true } }) },
    '@/lib/supabase/server': {
      createAdminClient: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { logo_path: 'logo.png' } }),
            }),
          }),
        }),
      }),
    },
    '@/lib/storage/branding': { uploadSchoolLogo: async () => ({ ok: true }), deleteSchoolLogo: async () => {} },
  })

  const form = new FormData()
  form.set('customName', 'NomeMuitoLongoParaMarca')
  const res = await updateSchoolSettings({ ok: false }, form)
  assert.equal(res.ok, false)
  assert.match(res.fieldErrors?.customName, /máximo 10 caracteres/)
})

test('createRoom e deleteRoom validam acesso e escopo da escola', async () => {
  let createdSchoolId = null
  let deletedSchoolId = null
  let deletedRoomId = null

  const { createRoom, deleteRoom } = load('../lib/actions/rooms.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-1' }) },
    '@/lib/supabase/server': {
      createClient: async () => ({
        from: () => ({
          insert: async (data) => {
            createdSchoolId = data.school_id
            return { error: null }
          },
          delete: () => ({
            eq: (key1, val1) => ({
              eq: async (key2, val2) => {
                deletedRoomId = val1
                deletedSchoolId = val2
                return { error: null }
              },
            }),
          }),
        }),
      }),
    },
  })

  // createRoom
  const formCreate = new FormData()
  formCreate.set('name', 'Sala de Bateria')
  const resCreate = await createRoom({ ok: false }, formCreate)
  assert.equal(resCreate.ok, true)
  assert.equal(createdSchoolId, 'school-1')

  // deleteRoom
  const formDelete = new FormData()
  formDelete.set('roomId', 'room-123')
  await deleteRoom(formDelete)
  assert.equal(deletedRoomId, 'room-123')
  assert.equal(deletedSchoolId, 'school-1')
})
