'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { sendCredentialsEmail } from '@/lib/notifications/credentials'
import { createAdminClient } from '@/lib/supabase/server'
import { createUserWithProfile, generatePassword } from '@/lib/users/admin'

export type ImportState = {
  ok: boolean
  error?: string
  created?: number
  failures?: { line: number; value: string; reason: string }[]
}

const MAX_ROWS = 200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ParsedRow = { name: string; email: string; extra: string[] }

// Cada linha = "Nome, email[, campo3, campo4...]" (vírgula, ponto-e-vírgula ou tab).
function parseRows(raw: string): ParsedRow[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim())
      return { name: parts[0] ?? '', email: (parts[1] ?? '').toLowerCase(), extra: parts.slice(2).filter(Boolean) }
    })
}

async function getSchoolName(admin: Awaited<ReturnType<typeof createAdminClient>>, schoolId: string): Promise<string | null> {
  const { data } = await admin.from('schools').select('name, custom_name').eq('id', schoolId).maybeSingle()
  return data ? data.custom_name || data.name : null
}

function validateBatch(formData: FormData): { rows: ParsedRow[] } | { error: string } {
  const rows = parseRows(String(formData.get('rows') ?? ''))
  if (rows.length === 0) return { error: 'Cole ao menos uma linha (Nome, e-mail).' }
  if (rows.length > MAX_ROWS) return { error: `Máximo de ${MAX_ROWS} por importação.` }
  return { rows }
}

// ── Alunos ───────────────────────────────────────────────────────────────────
export async function importStudents(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }
  const parsed = validateBatch(formData)
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const admin = await createAdminClient()
  const schoolName = await getSchoolName(admin, me.schoolId)
  let created = 0
  const failures: NonNullable<ImportState['failures']> = []

  for (let i = 0; i < parsed.rows.length; i++) {
    const r = parsed.rows[i]
    if (!r.name || r.name.length < 2) { failures.push({ line: i + 1, value: r.name || '(vazio)', reason: 'nome inválido' }); continue }
    if (!EMAIL_RE.test(r.email)) { failures.push({ line: i + 1, value: r.email || r.name, reason: 'e-mail inválido' }); continue }

    const password = generatePassword()
    const res = await createUserWithProfile({
      email: r.email,
      password,
      name: r.name,
      role: 'student',
      schoolId: me.schoolId,
      profile: { phone: r.extra[0] || null, parent_contact: r.extra[1] || null, status: 'active', notify_to: 'both' },
    })
    if (!res.ok) { failures.push({ line: i + 1, value: r.email, reason: res.error }); continue }
    created++
    await sendCredentialsEmail({ to: r.email, name: r.name, password, schoolName, kind: 'new' }).catch(() => {})
  }

  revalidatePath('/admin/students')
  return { ok: true, created, failures }
}

// ── Professores ──────────────────────────────────────────────────────────────
export async function importTeachers(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }
  const parsed = validateBatch(formData)
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const admin = await createAdminClient()
  const schoolName = await getSchoolName(admin, me.schoolId)
  let created = 0
  const failures: NonNullable<ImportState['failures']> = []

  for (let i = 0; i < parsed.rows.length; i++) {
    const r = parsed.rows[i]
    if (!r.name || r.name.length < 2) { failures.push({ line: i + 1, value: r.name || '(vazio)', reason: 'nome inválido' }); continue }
    if (!EMAIL_RE.test(r.email)) { failures.push({ line: i + 1, value: r.email || r.name, reason: 'e-mail inválido' }); continue }

    const password = generatePassword()
    const res = await createUserWithProfile({ email: r.email, password, name: r.name, role: 'teacher', schoolId: me.schoolId })
    if (!res.ok) { failures.push({ line: i + 1, value: r.email, reason: res.error }); continue }

    const { error: teacherError } = await admin.from('teachers').insert({
      user_id: res.userId,
      school_id: me.schoolId,
      instruments: r.extra.length ? r.extra : null,
      status: 'active',
    })
    if (teacherError) {
      await admin.auth.admin.deleteUser(res.userId)
      failures.push({ line: i + 1, value: r.email, reason: 'falha ao criar perfil de professor' })
      continue
    }
    created++
    await sendCredentialsEmail({ to: r.email, name: r.name, password, schoolName, kind: 'new' }).catch(() => {})
  }

  revalidatePath('/admin/teachers')
  return { ok: true, created, failures }
}
