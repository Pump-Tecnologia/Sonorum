'use server'

import { getCurrentUser } from '@/lib/auth/session'
import { sendCredentialsEmail } from '@/lib/notifications/credentials'
import { createAdminClient } from '@/lib/supabase/server'
import { generatePassword } from '@/lib/users/admin'

export type ResetPasswordState = { ok: boolean; error?: string; message?: string }

// Redefine a senha de um aluno/professor da escola e envia a nova por e-mail.
export async function resetUserPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const userId = String(formData.get('userId') ?? '')
  if (!userId) return { ok: false, error: 'Usuário inválido.' }

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

  const password = generatePassword()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: 'Não foi possível redefinir a senha.' }

  const school = target.schools as { name: string; custom_name: string | null } | null
  const res = await sendCredentialsEmail({
    to: target.email,
    name: target.name,
    password,
    schoolName: school?.custom_name || school?.name || null,
    kind: 'reset',
  })
  if (!res.ok) return { ok: false, error: 'Senha redefinida, mas o e-mail falhou. Tente novamente.' }

  return { ok: true, message: `Nova senha enviada para ${target.email}.` }
}
