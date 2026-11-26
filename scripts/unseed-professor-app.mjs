// Remove o professor de teste do app mobile e as aulas que o seed criou.
// Uso: node --env-file=.env.local scripts/unseed-professor-app.mjs
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = 'professor.teste@sonorum.local'
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
  if (!user) { console.log('nada a remover'); return }
  // Só as aulas deste professor de teste.
  const lessons = await api(`/rest/v1/lessons?select=id&teacher_id=eq.${user.id}`)
  const ids = lessons.map((l) => l.id)
  if (ids.length) {
    await api(`/rest/v1/lesson_pedagogical_resource?lesson_id=in.${inList(ids)}`, { method: 'DELETE' })
    await api(`/rest/v1/lesson_reports?lesson_id=in.${inList(ids)}`, { method: 'DELETE' })
    await api(`/rest/v1/lesson_plans?lesson_id=in.${inList(ids)}`, { method: 'DELETE' })
    await api(`/rest/v1/lessons?teacher_id=eq.${user.id}`, { method: 'DELETE' })
  }
  await api(`/rest/v1/teachers?user_id=eq.${user.id}`, { method: 'DELETE' })
  await api(`/rest/v1/users?id=eq.${user.id}`, { method: 'DELETE' }).catch(() => {})
  await api(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })
  console.log('professor de teste removido')
}

main().catch((err) => { console.error(err.message); process.exit(1) })
