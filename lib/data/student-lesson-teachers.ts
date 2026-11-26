import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database'

// O aluno só lê a própria linha em users (RLS), então o join com o professor volta vazio.
// A função do banco (migration 0039) devolve só o nome do professor das aulas do próprio aluno.
export async function getStudentLessonTeachers(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, string>> {
  const { data } = await supabase.rpc('student_lesson_teachers')
  return new Map((data ?? []).map((row) => [row.lesson_id, row.teacher_name]))
}
