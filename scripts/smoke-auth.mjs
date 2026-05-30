// Smoke test do backbone de auth (descartável). Roda contra o Supabase real.
// Valida: insert de escola, createUser via service-role, trigger handle_new_user,
// e Custom Access Token Hook (role + school_id no JWT). Limpa tudo ao final.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })

const stamp = Date.now()
const email = `smoke+${stamp}@sonorum.test`
const password = 'Sonorum123!'
const schoolName = `Escola Smoke ${stamp}`

let schoolId, userId
const decode = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())

try {
  // 1. cria escola
  const { data: school, error: e1 } = await admin
    .from('schools')
    .insert({ name: schoolName, slug: `escola-smoke-${stamp}`, plan_type: 'free', student_limit: 5 })
    .select('id')
    .single()
  if (e1) throw new Error(`insert school: ${e1.message}`)
  schoolId = school.id
  console.log('1. ✓ escola criada:', schoolId)

  // 2. cria admin com app_metadata
  const { data: created, error: e2 } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Admin Smoke' },
    app_metadata: { role: 'admin', school_id: schoolId },
  })
  if (e2) throw new Error(`createUser: ${e2.message}`)
  userId = created.user.id
  console.log('2. ✓ auth user criado:', userId)

  // 3. seta role/school_id explicitamente (espelha a action de registro)
  const { error: eUpd } = await admin
    .from('users')
    .update({ role: 'admin', school_id: schoolId, name: 'Admin Smoke' })
    .eq('id', userId)
  if (eUpd) throw new Error(`update profile: ${eUpd.message}`)

  const { data: profile, error: e3 } = await admin
    .from('users')
    .select('id, role, school_id, name, email')
    .eq('id', userId)
    .single()
  if (e3) throw new Error(`select profile: ${e3.message}`)
  console.log('3. ✓ public.users:', JSON.stringify(profile))
  if (profile.role !== 'admin') throw new Error(`role esperado admin, veio ${profile.role}`)
  if (profile.school_id !== schoolId) throw new Error('school_id do profile não bate')

  // 4. login + JWT claims
  const { data: session, error: e4 } = await anon.auth.signInWithPassword({ email, password })
  if (e4) throw new Error(`signIn: ${e4.message}`)
  const claims = decode(session.session.access_token)
  console.log('4. ✓ login OK. Claims do JWT:')
  console.log('     user_role =', claims.user_role)
  console.log('     school_id =', claims.school_id)
  if (claims.user_role !== 'admin') throw new Error('HOOK NÃO INJETOU user_role=admin')
  if (claims.school_id !== schoolId) throw new Error('HOOK NÃO INJETOU school_id correto')

  // 5. RLS: o admin enxerga a própria escola?
  const scoped = createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  })
  const { data: mySchool, error: e5 } = await scoped.from('schools').select('id, name')
  if (e5) throw new Error(`RLS schools: ${e5.message}`)
  console.log('5. ✓ RLS: admin vê', mySchool.length, 'escola(s):', mySchool.map((s) => s.id).join(','))
  if (mySchool.length !== 1 || mySchool[0].id !== schoolId) throw new Error('RLS de schools incorreto')

  console.log('\n🎉 BACKBONE OK — schema, trigger, hook e RLS funcionando.')
} catch (err) {
  console.error('\n❌ FALHOU:', err.message)
  process.exitCode = 1
} finally {
  // cleanup
  try {
    if (userId) await admin.auth.admin.deleteUser(userId)
    if (schoolId) await admin.from('schools').delete().eq('id', schoolId)
  } catch {
    // ignora falhas de limpeza
  }
  console.log('🧹 cleanup feito')
}
