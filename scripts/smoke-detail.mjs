// Valida o caminho de ESCRITA via RLS: admin (client de sessão) inserindo
// meta e nota de um aluno da própria escola (testa o `with check` das policies).
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
    email, password: 'Sonorum123!', email_confirm: true, app_metadata: { role, school_id: schoolId },
  })
  if (error) throw new Error(error.message)
  created.users.push(data.user.id)
  await admin.from('users').update({ role, school_id: schoolId, name: email }).eq('id', data.user.id)
  return data.user.id
}
const assert = (c, m) => { if (!c) throw new Error(m) }

try {
  const { data: school } = await admin.from('schools')
    .insert({ name: `Det ${stamp}`, slug: `det-${stamp}`, plan_type: 'free' }).select('id').single()
  created.schools.push(school.id)
  const adminEmail = `det-admin+${stamp}@sonorum.test`
  await mkUser(adminEmail, 'admin', school.id)
  const studentId = await mkUser(`det-student+${stamp}@sonorum.test`, 'student', school.id)

  // login admin → client escopado
  const a = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: sess } = await a.auth.signInWithPassword({ email: adminEmail, password: 'Sonorum123!' })
  const scoped = createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } },
  })

  // INSERT meta (with check school_id = current_school_id)
  const { error: gErr } = await scoped.from('student_goals')
    .insert({ student_id: studentId, school_id: school.id, text: 'Meta teste', completed: false })
  assert(!gErr, `insert meta falhou: ${gErr?.message}`)

  // INSERT nota
  const { error: nErr } = await scoped.from('student_notes')
    .insert({ user_id: studentId, school_id: school.id, content: 'Nota teste' })
  assert(!nErr, `insert nota falhou: ${nErr?.message}`)

  // lê de volta
  const { data: goals } = await scoped.from('student_goals').select('id').eq('student_id', studentId)
  const { data: notes } = await scoped.from('student_notes').select('id').eq('user_id', studentId)
  assert(goals?.length === 1 && notes?.length === 1, 'admin não leu meta/nota recém-criadas')

  // toggle + delete
  const { error: tErr } = await scoped.from('student_goals').update({ completed: true }).eq('id', goals[0].id)
  assert(!tErr, `toggle meta falhou: ${tErr?.message}`)

  console.log('✓ Admin insere/lê/atualiza meta e nota via RLS (with check OK)')
  console.log('\n🎉 DETALHE DO ALUNO OK')
} catch (err) {
  console.error('\n❌ FALHOU:', err.message); process.exitCode = 1
} finally {
  try {
    for (const id of created.users) await admin.auth.admin.deleteUser(id)
    for (const id of created.schools) await admin.from('schools').delete().eq('id', id)
  } catch {}
  console.log('🧹 cleanup feito')
}
