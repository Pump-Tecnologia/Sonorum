import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// Próxima aula iminente do professor (para o lembrete global): agendada/em
// andamento, que comece nos próximos 30 min ou já esteja rolando. Só professor.
export async function GET() {
  const me = await getCurrentUser()
  if (!me || me.role !== 'teacher') return NextResponse.json({ lesson: null })

  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 60 * 1000)

  const supabase = await createClient()
  const { data } = await supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, users!lessons_student_id_fkey(name)')
    .eq('teacher_id', me.id)
    .in('status', ['scheduled', 'in_progress'])
    .gte('end_datetime', now.toISOString())
    .lte('start_datetime', soon.toISOString())
    .order('start_datetime')
    .limit(1)
    .maybeSingle()

  if (!data) return NextResponse.json({ lesson: null })

  const student = data.users as { name: string } | null
  return NextResponse.json({
    lesson: {
      id: data.id,
      title: data.title,
      studentName: student?.name ?? '',
      start: data.start_datetime,
      end: data.end_datetime,
      status: data.status,
    },
  })
}
