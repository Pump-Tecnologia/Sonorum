// Remove o aluno de teste do app mobile e tudo que o seed criou.
// Uso: node --env-file=.env.local scripts/unseed-aluno-app.mjs
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = 'aluno.teste@sonorum.local'
const SCHOOL = 'b20fd919-db11-4124-ad40-1d9dcb24ff1d'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const api = async (path, init = {}) => {
  const r = await fetch(URL_ + path, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${r.status} ${text}`)
  return text ? JSON.parse(text) : null
}
const inList = (ids) => `(${ids.join(',')})`

async function main() {
  const [user] = await api(`/rest/v1/users?select=id&email=eq.${EMAIL}`)
  const resources = await api(`/rest/v1/pedagogical_resources?select=id&title=like.${encodeURIComponent('[Teste app] %')}`)
  if (user) {
    const lessons = await api(`/rest/v1/lessons?select=id&student_id=eq.${user.id}`)
    const lessonIds = lessons.map((l) => l.id)
    if (lessonIds.length) {
      await api(`/rest/v1/lesson_pedagogical_resource?lesson_id=in.${inList(lessonIds)}`, { method: 'DELETE' })
      await api(`/rest/v1/lesson_reports?lesson_id=in.${inList(lessonIds)}`, { method: 'DELETE' })
    }
    await api(`/rest/v1/charges?student_id=eq.${user.id}`, { method: 'DELETE' })
    await api(`/rest/v1/lessons?student_id=eq.${user.id}`, { method: 'DELETE' })
    await api(`/rest/v1/student_goals?student_id=eq.${user.id}`, { method: 'DELETE' })
    await api(`/rest/v1/enrollments?student_id=eq.${user.id}`, { method: 'DELETE' })
  }
  if (resources.length) await api(`/rest/v1/pedagogical_resources?id=in.${inList(resources.map((r) => r.id))}`, { method: 'DELETE' })
  await fetch(`${URL_}/storage/v1/object/resources/${SCHOOL}/seed-aluno-teste.pdf`, { method: 'DELETE', headers: H })
  if (user) {
    await api(`/rest/v1/users?id=eq.${user.id}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })
  }
  console.log(user ? 'aluno de teste removido' : 'nada a remover')
}

main().catch((err) => { console.error(err.message); process.exit(1) })
