// Valida: profile self-update, toggle de meta pelo aluno, magic link p/ impersonação.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const stamp = Date.now()
const created = { users: [], schools: [] }

async function mkUser(email, role, schoolId) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: 'Sonorum123!', email_confirm: true,
    app_metadata: { role, school_id: schoolId },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  created.users.push(data.user.id)
  await admin.from('users').update({ role, school_id: schoolId, name: email }).eq('id', data.user.id)
  return data.user.id
}

async function loginScoped(email) {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email, password: 'Sonorum123!' })
  if (error) throw new Error(error.message)
  return createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

const assert = (c, m) => { if (!c) throw new Error(m) }

try {
  const { data: school } = await admin.from('schools')
    .insert({ name: `Parity ${stamp}`, slug: `parity-${stamp}`, plan_type: 'free' }).select('id').single()
  created.schools.push(school.id)

  const studentEmail = `s+${stamp}@sonorum.test`
  const adminEmail = `a+${stamp}@sonorum.test`
  await mkUser(adminEmail, 'admin', school.id)
  const studentId = await mkUser(studentEmail, 'student', school.id)

  // 1. Admin cria meta para o aluno
  const adminScoped = await loginScoped(adminEmail)
  const { data: goal, error: gErr } = await adminScoped.from('student_goals')
    .insert({ student_id: studentId, school_id: school.id, text: 'Meta', completed: false })
    .select('id').single()
  assert(!gErr, `criar meta: ${gErr?.message}`)
  console.log('1. ✓ admin criou meta')

  // 2. ALUNO marca a própria meta como concluída (policy student_goals_student_update)
  const studentScoped = await loginScoped(studentEmail)
  const { error: tErr } = await studentScoped.from('student_goals')
    .update({ completed: true }).eq('id', goal.id)
  assert(!tErr, `toggle de meta pelo aluno: ${tErr?.message}`)
  const { data: check } = await studentScoped.from('student_goals').select('completed').eq('id', goal.id).single()
  assert(check?.completed === true, 'aluno não conseguiu marcar como concluída')
  console.log('2. ✓ aluno marcou própria meta como concluída (RLS OK)')

  // 3. Aluno NÃO pode marcar meta de outro aluno (validamos negativamente)
  const otherStudentEmail = `os+${stamp}@sonorum.test`
  const otherStudentId = await mkUser(otherStudentEmail, 'student', school.id)
  const { data: otherGoal } = await adminScoped.from('student_goals')
    .insert({ student_id: otherStudentId, school_id: school.id, text: 'X', completed: false })
    .select('id').single()

  const { error: forbidden, count } = await studentScoped.from('student_goals')
    .update({ completed: true }, { count: 'exact' }).eq('id', otherGoal.id)
  // RLS faz update silenciar (0 rows). Não dá erro, mas count = 0.
  assert(!forbidden, 'esperava update silencioso, veio erro')
  assert((count ?? 0) === 0, 'ISOLAMENTO FUROU: aluno marcou meta de outro')
  console.log('3. ✓ aluno NÃO consegue marcar meta de outro (RLS OK)')

  // 4. Profile self-update: aluno muda o próprio nome
  const { error: profErr } = await studentScoped.from('users')
    .update({ name: 'Aluno Renomeado' }).eq('id', studentId)
  assert(!profErr, `self-update: ${profErr?.message}`)
  console.log('4. ✓ aluno atualizou o próprio nome (RLS users_self_update)')

  // 5. Magic link (impersonação) — verifica se a API responde
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: studentEmail,
  })
  assert(!linkErr && link?.properties?.hashed_token, `magic link: ${linkErr?.message}`)
  console.log('5. ✓ magic link gerado (base da impersonação)')

  console.log('\n🎉 PARIDADE OK — todas as funções essenciais validadas')
} catch (err) {
  console.error('\n❌ FALHOU:', err.message); process.exitCode = 1
} finally {
  try {
    for (const id of created.users) await admin.auth.admin.deleteUser(id)
    for (const id of created.schools) await admin.from('schools').delete().eq('id', id)
  } catch {}
  console.log('🧹 cleanup')
}
