// Professor de teste para validar o app mobile com dados reais (Escola de teste).
// Uso: node --env-file=.env.local scripts/seed-professor-app.mjs [--dry] [--out ../sonorum-mobile/.env.local]
// Cria professor.teste@sonorum.local e aulas hoje e nos próximos dias com alunos fictícios.
// A senha é gerada aqui e gravada só no arquivo --out (nunca impressa). Apagar com unseed-professor-app.mjs.
import crypto from 'node:crypto'
import fs from 'node:fs'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY = process.argv.includes('--dry')
const outIdx = process.argv.indexOf('--out')
const OUT = outIdx > -1 ? process.argv[outIdx + 1] : null
const SCHOOL = 'b20fd919-db11-4124-ad40-1d9dcb24ff1d'
const ROOM = '54a038f9-fed5-4b3a-affb-4ee381f1a65e' // bat1
const EMAIL = 'professor.teste@sonorum.local'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const api = async (path, init = {}) => {
  const r = await fetch(URL_ + path, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${r.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const DAY = 86400000
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
function at(offsetDays, hhmm) {
  const day = ymd(new Date(Date.now() + offsetDays * DAY))
  const s = new Date(`${day}T${hhmm}:00-03:00`)
  return { s, e: new Date(s.getTime() + 50 * 60000) }
}

// [dias a partir de hoje, hora, aluno (e-mail), título, usa sala, objetivos]
const LESSONS = [
  [0, '08:10', 'theo@seed.sonorum.local', 'Bateria: Rudimentos', true, 'Fechar o rulo simples a 70 bpm.'],
  [0, '09:30', 'pedro@seed.sonorum.local', 'Bateria: Viradas', true, null],
  [0, '11:00', 'aluno.teste@sonorum.local', 'Bateria: Primeira música', false, 'Tocar a música inteira sem parar.'],
  [0, '15:20', 'caio@seed.sonorum.local', 'Violão: Acordes abertos', false, null],
  [0, '19:30', 'helena@seed.sonorum.local', 'Piano: Escala de Dó maior', false, 'Duas oitavas com as duas mãos.'],
  [0, '21:00', 'alice@seed.sonorum.local', 'Violino: Postura do arco', false, null],
  [1, '09:00', 'theo@seed.sonorum.local', 'Bateria: Dinâmica', true, null],
  [1, '14:00', 'helena@seed.sonorum.local', 'Piano: Primeira peça', false, null],
  [2, '10:30', 'pedro@seed.sonorum.local', 'Bateria: Contratempo', true, null],
  [4, '16:00', 'caio@seed.sonorum.local', 'Violão: Dedilhado', false, null],
]

async function main() {
  if (DRY) { console.log(`dry: ${LESSONS.length} aulas`); return }
  const [existing] = await api(`/rest/v1/users?select=id&email=eq.${EMAIL}`)
  if (existing) throw new Error(`${EMAIL} já existe; rode unseed-professor-app.mjs antes`)

  // Confere os alunos antes de criar qualquer coisa.
  const emails = [...new Set(LESSONS.map((l) => l[2]))]
  const students = await api(`/rest/v1/users?select=id,email&email=in.(${emails.join(',')})`)
  const idOf = Object.fromEntries(students.map((s) => [s.email, s.id]))
  const missing = emails.filter((e) => !idOf[e])
  if (missing.length) throw new Error(`alunos não encontrados: ${missing.join(', ')}`)

  const password = crypto.randomBytes(12).toString('base64url')
  const created = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: EMAIL, email_confirm: true, password,
      user_metadata: { name: 'Professor Teste' },
      app_metadata: { role: 'teacher', school_id: SCHOOL },
    }),
  })
  const teacherId = created.id
  await api(`/rest/v1/users?id=eq.${teacherId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Professor Teste', role: 'teacher', school_id: SCHOOL, status: 'active', notify_email: false }),
  })
  await api('/rest/v1/teachers', {
    method: 'POST',
    body: JSON.stringify({ user_id: teacherId, school_id: SCHOOL, instruments: ['Bateria', 'Violão', 'Piano'], status: 'active' }),
  })

  const rows = LESSONS.map(([off, hhmm, email, title, room, goals]) => {
    const { s, e } = at(off, hhmm)
    return {
      school_id: SCHOOL, student_id: idOf[email], teacher_id: teacherId, room_id: room ? ROOM : null,
      title, start_datetime: s.toISOString(), end_datetime: e.toISOString(), status: 'scheduled', goals, notes: null,
    }
  })
  const lessons = await api('/rest/v1/lessons?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rows) })

  if (OUT) {
    const keep = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter((l) => !l.startsWith('EXPO_PUBLIC_DEV_LOGIN_TEACHER_')) : []
    fs.writeFileSync(OUT, [...keep.filter((l, i, a) => !(l === '' && i === a.length - 1)), `EXPO_PUBLIC_DEV_LOGIN_TEACHER_EMAIL=${EMAIL}`, `EXPO_PUBLIC_DEV_LOGIN_TEACHER_PASSWORD=${password}`, ''].join('\n'))
  }
  console.log(`ok: professor ${EMAIL}, ${lessons.length} aulas${OUT ? `, credenciais gravadas em ${OUT}` : ''}`)
}

main().catch((err) => { console.error(err.message); process.exit(1) })
