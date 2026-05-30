import { PageHeader } from '@/components/app/PageHeader'
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Agenda' }

export default async function SchedulePage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Admin/Teacher: carrega listas para o modal de criar aula
  const [studentsRes, teachersRes] = await Promise.all([
    user?.role !== 'student'
      ? supabase.from('users').select('id, name').eq('role', 'student').order('name')
      : Promise.resolve({ data: [] }),
    user?.role === 'admin'
      ? supabase.from('users').select('id, name').eq('role', 'teacher').order('name')
      : Promise.resolve({ data: [] }),
  ])

  return (
    <>
      <PageHeader title="Agenda" subtitle="Visualize e gerencie as aulas" />
      <ScheduleCalendar
        students={(studentsRes.data ?? []) as { id: string; name: string }[]}
        teachers={(teachersRes.data ?? []) as { id: string; name: string }[]}
        role={user?.role ?? 'student'}
        userId={user?.id ?? ''}
      />
    </>
  )
}
