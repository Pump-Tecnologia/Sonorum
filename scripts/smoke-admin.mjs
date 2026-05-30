// Smoke test do fluxo de gestão (descartável). Valida criação de escola/admin/
// professor/aluno via service-role e o ISOLAMENTO ENTRE ESCOLAS via RLS.
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
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const stamp = Date.now()
const created = { users: [], schools: [] }

async function makeSchool(label) {
  const { data: s, error } = await admin
    .from('schools')
    .insert({ name: `${label} ${stamp}`, slug: `${label.toLowerCase()}-${stamp}`, plan_type: 'free', student_limit: 5 })
    .select('id')
    .single()
  if (error) throw new Error(`school ${label}: ${error.message}`)
  created.schools.push(s.id)
  return s.id
}

async function makeUser({ email, name, role, schoolId, profile }) {
  const { data: c, error } = await admin.auth.admin.createUser({
    email, password: 'Sonorum123!', email_confirm: true,
    user_metadata: { name }, app_metadata: { role, school_id: schoolId },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  created.users.push(c.user.id)
  const { error: e2 } = await admin.from('users')
    .update({ role, school_id: schoolId, name, ...profile }).eq('id', c.user.id)
  if (e2) throw new Error(`profile ${email}: ${e2.message}`)
  return c.user.id
}

async function scopedFor(email) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email, password: 'Sonorum123!' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

try {
  // Escola A com admin, professor e aluno
  const schoolA = await makeSchool('EscolaA')
  const adminAEmail = `adminA+${stamp}@sonorum.test`
  await makeUser({ email: adminAEmail, name: 'Admin A', role: 'admin', schoolId: schoolA })
  const teacherId = await makeUser({ email: `teacherA+${stamp}@sonorum.test`, name: 'Prof A', role: 'teacher', schoolId: schoolA })
  await admin.from('teachers').insert({ user_id: teacherId, school_id: schoolA, instruments: ['Violão'], status: 'active' })
  const studentId = await makeUser({ email: `studentA+${stamp}@sonorum.test`, name: 'Aluno A', role: 'student', schoolId: schoolA, profile: { instrument: ['Piano'], monthly_fee: 200 } })
  await admin.from('student_goals').insert({ student_id: studentId, school_id: schoolA, text: 'Aprender escala', completed: false })
  console.log('1. ✓ Escola A criada com admin, professor e aluno')

  // Escola B (para teste de isolamento)
  const schoolB = await makeSchool('EscolaB')
  const adminBEmail = `adminB+${stamp}@sonorum.test`
  await makeUser({ email: adminBEmail, name: 'Admin B', role: 'admin', schoolId: schoolB })
  console.log('2. ✓ Escola B criada com admin')

  // Admin A enxerga seus alunos/professores (RLS staff_select)
  const aA = await scopedFor(adminAEmail)
  const { data: studentsA } = await aA.from('users').select('id, name').eq('role', 'student')
  const { data: teachersA } = await aA.from('teachers').select('id, instruments')
  const { data: goalsA } = await aA.from('student_goals').select('id, text')
  assert(studentsA?.length === 1, `admin A deveria ver 1 aluno, viu ${studentsA?.length}`)
  assert(teachersA?.length === 1, `admin A deveria ver 1 professor, viu ${teachersA?.length}`)
  assert(goalsA?.length === 1, `admin A deveria ver 1 meta, viu ${goalsA?.length}`)
  console.log('3. ✓ Admin A vê 1 aluno, 1 professor, 1 meta (RLS staff)')

  // ISOLAMENTO: Admin B NÃO enxerga nada da escola A
  const aB = await scopedFor(adminBEmail)
  const { data: studentsB } = await aB.from('users').select('id').eq('role', 'student')
  const { data: teachersB } = await aB.from('teachers').select('id')
  const { data: goalsB } = await aB.from('student_goals').select('id')
  assert((studentsB?.length ?? 0) === 0, `ISOLAMENTO FUROU: admin B viu ${studentsB?.length} alunos da escola A`)
  assert((teachersB?.length ?? 0) === 0, `ISOLAMENTO FUROU: admin B viu ${teachersB?.length} professores`)
  assert((goalsB?.length ?? 0) === 0, `ISOLAMENTO FUROU: admin B viu ${goalsB?.length} metas`)
  console.log('4. ✓ ISOLAMENTO OK: admin B não vê nada da escola A')

  // Aluno A vê só a si mesmo (não vê o professor como "users")
  const sA = await scopedFor(`studentA+${stamp}@sonorum.test`)
  const { data: selfRows } = await sA.from('users').select('id, role')
  assert(selfRows?.length === 1 && selfRows[0].id === studentId, 'aluno deveria ver só a si mesmo')
  console.log('5. ✓ Aluno A vê apenas o próprio perfil')

  console.log('\n🎉 GESTÃO OK — criação multi-papel + RLS + isolamento entre escolas.')
} catch (err) {
  console.error('\n❌ FALHOU:', err.message)
  process.exitCode = 1
} finally {
  try {
    for (const id of created.users) await admin.auth.admin.deleteUser(id)
    for (const id of created.schools) await admin.from('schools').delete().eq('id', id)
  } catch {}
  console.log('🧹 cleanup feito')
}
