import { createAdminClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/constants/roles'
import type { TablesUpdate } from '@/lib/types/database'

// Senha temporária legível para contas criadas por um admin.
export function generatePassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

interface CreateUserInput {
  email: string
  password: string
  name: string
  role: Role
  schoolId: string
  profile?: Partial<TablesUpdate<'users'>>
}

type CreateUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; isDuplicate?: boolean }

// Cria um usuário de auth + seu perfil em public.users, dentro de uma escola.
// Encapsula o padrão GoTrue: o app_metadata só é aplicado após o INSERT, então
// setamos role/school_id/perfil explicitamente logo depois (validado no smoke test).
export async function createUserWithProfile({
  email,
  password,
  name,
  role,
  schoolId,
  profile,
}: CreateUserInput): Promise<CreateUserResult> {
  const admin = await createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role, school_id: schoolId },
  })

  if (createError || !created.user) {
    const isDuplicate = /already registered|exists/i.test(createError?.message ?? '')
    return {
      ok: false,
      error: isDuplicate ? 'Este e-mail já está cadastrado.' : 'Não foi possível criar o usuário.',
      isDuplicate,
    }
  }

  const { error: profileError } = await admin
    .from('users')
    .update({ role, school_id: schoolId, name, ...profile })
    .eq('id', created.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: 'Não foi possível finalizar o perfil do usuário.' }
  }

  return { ok: true, userId: created.user.id }
}
