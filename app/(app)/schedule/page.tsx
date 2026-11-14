import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar'
import { getCurrentUser } from '@/lib/auth/session'
import { listActiveTeachers } from '@/lib/queries/teachers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Agenda' }

export default async function SchedulePage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Admin/Teacher: carrega listas para o modal de criar aula.
  // Filtra alunos/professores ATIVOS — não faz sentido agendar com inativo.
  const [studentsRes, teachersList, roomsRes] = await Promise.all([
    user?.role !== 'student'
      ? supabase.from('users').select('id, name').eq('role', 'student').eq('status', 'active').order('name')
      : Promise.resolve({ data: [] }),
    user?.role === 'admin' && user.schoolId
      ? listActiveTeachers(supabase, user.schoolId)
      : Promise.resolve([]),
    user?.role !== 'student'
      ? supabase.from('rooms').select('id, name').eq('active', true).order('name')
      : Promise.resolve({ data: [] }),
  ])

  // O título da página (h1 "Agenda") fica no cabeçalho do próprio calendário.
  return (
    <ScheduleCalendar
      students={(studentsRes.data ?? []) as { id: string; name: string }[]}
      teachers={teachersList}
      rooms={(roomsRes.data ?? []) as { id: string; name: string }[]}
      role={user?.role ?? 'student'}
      userId={user?.id ?? ''}
    />
  )
}
