'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { sendCredentialsEmail } from '@/lib/notifications/credentials'
import { rateLimit, RATE_LIMIT_MESSAGE } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

export type ResetPasswordState = { ok: boolean; error?: string; message?: string }

// Envia ao aluno/professor um link de uso único para que escolha nova senha.
export async function resetUserPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { ok: false, error: 'Usuário inválido.' }

  // Cada reset dispara e-mail — limita a cadência por admin.
  const rl = await rateLimit(`pwadmin:${me.id}`, 10, 10 * 60 * 1000)
  if (!rl.ok) return { ok: false, error: RATE_LIMIT_MESSAGE }

  const admin = await createAdminClient()
  const { data: target } = await admin
    .from('users')
    .select('id, name, email, role, school_id, schools(name, custom_name)')
    .eq('id', userId)
    .maybeSingle()

  if (!target || target.school_id !== me.schoolId || !['student', 'teacher'].includes(target.role)) {
    return { ok: false, error: 'Usuário não encontrado nesta escola.' }
  }
  if (!target.email) return { ok: false, error: 'Usuário sem e-mail cadastrado.' }

  const school = target.schools as { name: string; custom_name: string | null } | null
  const res = await sendCredentialsEmail({
    admin,
    to: target.email,
    name: target.name,
    schoolName: school?.custom_name || school?.name || null,
    kind: 'reset',
  })
  if (!res.ok) return { ok: false, error: 'Não foi possível enviar o link de redefinição. Tente novamente.' }

  return { ok: true, message: `Link de redefinição enviado para ${target.email}.` }
}
