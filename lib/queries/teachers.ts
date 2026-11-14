import type { SupabaseClient } from '@supabase/supabase-js'

export interface TeacherOption {
  id: string
  name: string
}

// Professores ATIVOS da escola — fonte é public.teachers (não users.role),
// pra incluir admins que também dão aula (plano Solo/Solo Pro, ou admin de
// escola comum que ativou "também dou aula" no perfil). Ver lib/auth/session.ts.
export async function listActiveTeachers(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<TeacherOption[]> {
  const { data } = await supabase
    .from('teachers')
    .select('status, users!inner(id, name, status)')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .eq('users.status', 'active')
    .order('name', { referencedTable: 'users' })

  const rows = (data ?? []) as unknown as { users: { id: string; name: string; status: string } | null }[]
  return rows
    .map((row) => (row.users ? { id: row.users.id, name: row.users.name } : null))
    .filter((t): t is TeacherOption => t !== null)
}

// Confere se um user_id é professor ATIVO da escola (via public.teachers) —
// substitui a checagem antiga `users.role = 'teacher'` na validação de aulas.
export async function isActiveTeacherOfSchool(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .maybeSingle()
  return data != null
}
