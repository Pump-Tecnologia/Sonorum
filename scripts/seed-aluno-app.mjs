// Aluno de teste para validar o app mobile com dados reais (Escola de teste).
// Uso: node --env-file=.env.local scripts/seed-aluno-app.mjs [--dry] [--out ../sonorum-mobile/.env.local]
// Cria o aluno aluno.teste@sonorum.local com aulas, laudos, metas, matrícula, cobranças e materiais.
// A senha é gerada aqui e gravada só no arquivo --out (nunca impressa). Apagar com unseed-aluno-app.mjs.
import crypto from 'node:crypto'
import fs from 'node:fs'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY = process.argv.includes('--dry')
const outIdx = process.argv.indexOf('--out')
const OUT = outIdx > -1 ? process.argv[outIdx + 1] : null
const SCHOOL = 'b20fd919-db11-4124-ad40-1d9dcb24ff1d'
const TEACHER = '0b309ace-2d36-4b39-b7c2-ddde117ac461' // Matheus Ferreira
const PLAN = '1df3da33-b84d-4961-994b-c58741fa3e05' // BATERIA KIDS (249, 229 até o vencimento)
const ROOM = '54a038f9-fed5-4b3a-affb-4ee381f1a65e' // bat1
const EMAIL = 'aluno.teste@sonorum.local'
const PREFIX = '[Teste app] '
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const api = async (path, init = {}) => {
  const r = await fetch(URL_ + path, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${r.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const DAY = 86400000
// 07:30 (-03:00) do dia, para não colidir com a agenda real.
function slot(offsetDays) {
  const d = new Date(Date.now() + offsetDays * DAY)
  const ymd = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const s = new Date(`${ymd}T07:30:00-03:00`)
  return { s, e: new Date(s.getTime() + 50 * 60000) }
}
const ymdOffset = (n) => new Date(Date.now() + n * DAY).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

const PAST = [
  { off: -35, title: 'Bateria: Postura e pegada', status: 'completed', scores: [2, 2, 2, 3], song: null, bpm: [null, null] },
  { off: -28, title: 'Bateria: Rudimentos básicos', status: 'completed', scores: [2, 3, 2, 4], song: 'Rock simples', bpm: [60, 66] },
  { off: -21, title: 'Bateria: Pulsação em quatro tempos', status: 'missed', scores: null },
  { off: -14, title: 'Bateria: Viradas simples', status: 'completed', scores: [3, 3, 3, 4], song: 'Rock simples', bpm: [66, 78] },
  { off: -7, title: 'Bateria: Primeira música', status: 'completed', scores: [4, 3, 3, 3], song: 'Seven Nation Army', bpm: [72, 92], room: true,
    notes: 'Boa evolução na pulsação. Treinar as viradas com metrônomo a 80 bpm.', goals: 'Tocar a primeira música inteira sem parar.' },
]
const FUTURE = [
  { off: 3, title: 'Bateria: Dinâmica e volume', status: 'scheduled', room: true, goals: 'Controlar o volume entre pratos e caixa.' },
  { off: 10, title: 'Bateria: Segunda música', status: 'scheduled' },
]

const TINY_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 18 Tf 20 70 Td (Material de teste) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF
`

async function main() {
  if (DRY) {
    console.log(`dry: ${PAST.length} aulas passadas, ${FUTURE.length} futuras, 3 metas, 3 cobranças, 3 materiais`)
    return
  }
  const sample = await api(`/rest/v1/users?select=instrument&id=eq.6fd58f14-a737-4238-a673-d55c439619ff`)
  const asArray = Array.isArray(sample[0]?.instrument)

  const password = crypto.randomBytes(12).toString('base64url')
  const created = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: EMAIL,
      email_confirm: true,
      password,
      user_metadata: { name: 'Aluno Teste' },
      app_metadata: { role: 'student', school_id: SCHOOL },
    }),
  })
  const studentId = created.id
  await api(`/rest/v1/users?id=eq.${studentId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Aluno Teste', role: 'student', school_id: SCHOOL, status: 'active',
      instrument: asArray ? ['Bateria'] : 'Bateria', instrument_category: 'Percussão',
      notify_email: false, default_teacher_id: TEACHER,
    }),
  })

  const [enrollment] = await api('/rest/v1/enrollments?select=id', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ school_id: SCHOOL, student_id: studentId, plan_id: PLAN, due_day: 10, status: 'active' }),
  })

  const all = [...PAST, ...FUTURE].map((l) => {
    const { s, e } = slot(l.off)
    return {
      school_id: SCHOOL, student_id: studentId, teacher_id: TEACHER, room_id: l.room ? ROOM : null,
      title: l.title, start_datetime: s.toISOString(), end_datetime: e.toISOString(), status: l.status,
      notes: l.notes ?? null, goals: l.goals ?? null,
    }
  })
  const lessons = await api('/rest/v1/lessons?select=id,title,status', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(all) })
  const byTitle = Object.fromEntries(lessons.map((l) => [l.title, l.id]))

  const reports = PAST.filter((p) => p.scores).map((p) => ({
    school_id: SCHOOL, lesson_id: byTitle[p.title],
    technique_score: p.scores[0], theory_score: p.scores[1], repertoire_score: p.scores[2], practice_score: p.scores[3],
    current_song: p.song, initial_bpm: p.bpm[0], reached_bpm: p.bpm[1],
  }))
  await api('/rest/v1/lesson_reports', { method: 'POST', body: JSON.stringify(reports) })

  await api('/rest/v1/student_goals', {
    method: 'POST',
    body: JSON.stringify([
      { school_id: SCHOOL, student_id: studentId, text: 'Tocar a primeira música inteira', completed: false },
      { school_id: SCHOOL, student_id: studentId, text: 'Manter 80 bpm sem acelerar', completed: false },
      { school_id: SCHOOL, student_id: studentId, text: 'Aprender a segurar as baquetas', completed: true },
    ]),
  })

  // PostgREST exige as mesmas chaves em todas as linhas do lote.
  const charge = (off, status, extra = {}) => ({
    school_id: SCHOOL, enrollment_id: enrollment.id, student_id: studentId, amount: 249, due_date: ymdOffset(off), status,
    description: 'Mensalidade BATERIA KIDS', early_pay_amount: 229, paid_amount: null, paid_at: null, payment_method: null, ...extra,
  })
  await api('/rest/v1/charges', {
    method: 'POST',
    body: JSON.stringify([
      charge(6, 'pending'),
      charge(-24, 'pending'),
      charge(-54, 'paid', { paid_amount: 229, paid_at: new Date(Date.now() - 58 * DAY).toISOString(), payment_method: 'Pix' }),
    ]),
  })

  // PDF no bucket privado + materiais (texto, vídeo, PDF) ligados às aulas já realizadas.
  const pdfPath = `${SCHOOL}/seed-aluno-teste.pdf`
  const up = await fetch(`${URL_}/storage/v1/object/resources/${pdfPath}`, {
    method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: TINY_PDF,
  })
  if (!up.ok) throw new Error(`upload do PDF → ${up.status} ${await up.text()}`)

  const resources = await api('/rest/v1/pedagogical_resources?select=id,title', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify(
      [
        { title: `${PREFIX}Aquecimento de pulsos`, description: 'Cinco minutos antes de tocar.', category: 'Aquecimento', difficulty: 'Iniciante', content_type: 'Texto', body: 'Gire os punhos devagar, dez vezes para cada lado. Depois toque em alternado na almofada por dois minutos.' },
        { title: `${PREFIX}Pulsação com metrônomo`, description: 'Demonstração em câmera lenta.', category: 'Técnica', difficulty: 'Intermediário', content_type: 'Link Vídeo', content_link: 'https://example.com/video' },
        { title: `${PREFIX}Partitura: Rock simples`, description: 'Uma página com o ritmo base.', category: 'Repertório', difficulty: 'Iniciante', content_type: 'PDF', file_path: pdfPath },
      ].map((r) => ({ school_id: SCHOOL, created_by: TEACHER, body: null, content_link: null, file_path: null, ...r })),
    ),
  })
  const doneLessons = PAST.filter((p) => p.status === 'completed').map((p) => byTitle[p.title])
  await api('/rest/v1/lesson_pedagogical_resource', {
    method: 'POST',
    body: JSON.stringify(resources.map((r, i) => ({ lesson_id: doneLessons[i], pedagogical_resource_id: r.id }))),
  })

  if (OUT) {
    const keep = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter((l) => !l.startsWith('EXPO_PUBLIC_DEV_LOGIN_')) : []
    fs.writeFileSync(OUT, [...keep.filter((l, i, a) => !(l === '' && i === a.length - 1)), `EXPO_PUBLIC_DEV_LOGIN_EMAIL=${EMAIL}`, `EXPO_PUBLIC_DEV_LOGIN_PASSWORD=${password}`, ''].join('\n'))
  }
  console.log(`ok: aluno ${EMAIL}, ${lessons.length} aulas, ${resources.length} materiais${OUT ? `, credenciais gravadas em ${OUT}` : ''}`)
}

main().catch((err) => { console.error(err.message); process.exit(1) })
