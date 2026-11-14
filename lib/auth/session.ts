import { cache } from 'react'
import { redirect } from 'next/navigation'

import { homeForRole, type Role } from '@/lib/constants/roles'
import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  email: string | null
  name: string
  role: Role
  schoolId: string | null
  avatarPath: string | null
  // "Dá aula" de fato (linha em public.teachers) — independente do role
  // principal. Um admin pode ser isTeacher=true (ex.: plano Solo, ou admin de
  // escola que também dá aula); um role='teacher' sempre é isTeacher=true.
  isTeacher: boolean
}

// Carrega o usuário autenticado + perfil. Memoizado por request (React cache).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: teacherRow }] = await Promise.all([
    supabase.from('users').select('name, role, school_id, avatar_path, email').eq('id', user.id).single(),
    supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle(),
  ])

  if (!profile) return null

  return {
    id: user.id,
    email: (profile.email as string) ?? user.email ?? null,
    name: (profile.name as string) ?? '',
    role: (profile.role as Role) ?? 'student',
    schoolId: (profile.school_id as string) ?? null,
    avatarPath: (profile.avatar_path as string) ?? null,
    isTeacher: profile.role === 'teacher' || teacherRow != null,
  }
})

// Layouts and pages can render concurrently. Each page that dereferences the
// user must guard itself, even when its parent layout already checks access.
export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

// Para páginas que exigem um papel específico. Redireciona se não bater.
export function homePathForRole(role: Role): string {
  return homeForRole(role)
}
