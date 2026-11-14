import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

// Tom do evento por status ou instrumento. As cores ficam no CSS da agenda
// (schedule.module.css, [data-tone]); a API só diz qual tom usar. Aula
// concluída mantém a cor do instrumento: o CSS apaga pelo data-status.
type EventTone = 'missed' | 'late' | 'piano' | 'violao' | 'cordas' | 'canto' | 'bateria' | 'outro'

function eventTone(instrument: unknown, status: string): EventTone {
  if (status === 'missed') return 'missed'
  if (status === 'late') return 'late'
  const instr = String(Array.isArray(instrument) ? instrument[0] : instrument ?? '').toLowerCase()
  if (/piano|teclado/.test(instr)) return 'piano'
  if (/violão|guitarra/.test(instr)) return 'violao'
  if (/violino|cordas/.test(instr)) return 'cordas'
  if (/canto|voz/.test(instr)) return 'canto'
  if (/bateria|percussão/.test(instr)) return 'bateria'
  return 'outro'
}

export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json([], { status: 401 })

  const { searchParams } = request.nextUrl
  const start = searchParams.get('start') ?? undefined
  const end = searchParams.get('end') ?? undefined
  const teacherFilter = searchParams.get('teacher_id') ?? undefined

  const supabase = await createClient()

  let query = supabase
    .from('lessons')
    .select('id, title, start_datetime, end_datetime, status, notes, student_id, teacher_id, room_id, series_id, users!lessons_student_id_fkey(name, instrument), room:rooms(name)')

  // Aulas canceladas saem da agenda — o registro continua no banco (histórico),
  // mas não polui o calendário. Quem precisa do histórico usa relatórios/planner.
  query = query.neq('status', 'canceled')

  if (me.role === 'student') {
    query = query.eq('student_id', me.id)
  }
  if (start) query = query.gte('start_datetime', start)
  if (end) query = query.lte('start_datetime', end)
  if (teacherFilter) query = query.eq('teacher_id', teacherFilter)

  const { data } = await query.order('start_datetime')

  // Só a equipe arrasta aulas, e só as que ainda vão acontecer.
  const canManage = me.role === 'admin' || me.role === 'teacher'

  type UserRow = { name: string; instrument: unknown }
  const events = (data ?? []).map((l) => {
    const student = l.users as UserRow | null
    return {
      id: l.id,
      title: `${l.title} — ${student?.name ?? 'Aluno'}`,
      start: l.start_datetime,
      end: l.end_datetime,
      startEditable: canManage && l.status === 'scheduled',
      durationEditable: false,
      extendedProps: {
        tone: eventTone(student?.instrument, l.status),
        lesson_title: l.title,
        student_id: l.student_id,
        teacher_id: l.teacher_id,
        status: l.status,
        notes: l.notes,
        student_name: student?.name ?? '',
        instrument: student?.instrument,
        room: (l.room as { name: string } | null)?.name ?? '',
        room_id: l.room_id ?? '',
        series_id: l.series_id ?? '',
      },
    }
  })

  return NextResponse.json(events)
}
