import { cache } from 'react'

import { homeForRole, type Role } from '@/lib/constants/roles'
import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  email: string | null
  name: string
  role: Role
  schoolId: string | null
  avatarPath: string | null
}

// Carrega o usuário autenticado + perfil. Memoizado por request (React cache).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('name, role, school_id, avatar_path, email')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: (profile.email as string) ?? user.email ?? null,
    name: (profile.name as string) ?? '',
    role: (profile.role as Role) ?? 'student',
    schoolId: (profile.school_id as string) ?? null,
    avatarPath: (profile.avatar_path as string) ?? null,
  }
})

// Para páginas que exigem um papel específico. Redireciona se não bater.
export function homePathForRole(role: Role): string {
  return homeForRole(role)
}
