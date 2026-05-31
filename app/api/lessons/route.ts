import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

// Paleta de cores por instrumento — espelha o Laravel
function eventColor(instrument: unknown, status: string): string {
  if (status === 'canceled') return '#E5E7EB'
  if (status === 'completed') return '#D1FAE5'
  if (status === 'missed') return '#FECACA'
  if (status === 'late') return '#FDE68A'
  const instr = String(Array.isArray(instrument) ? instrument[0] : instrument ?? '').toLowerCase()
  if (/piano|teclado/.test(instr)) return '#BFDBFE'
  if (/violão|guitarra/.test(instr)) return '#FDE68A'
  if (/violino|cordas/.test(instr)) return '#A7F3D0'
  if (/canto|voz/.test(instr)) return '#FBCFE8'
  if (/bateria|percussão/.test(instr)) return '#DDD6FE'
  return '#E0E7FF'
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
    .select('id, title, start_datetime, end_datetime, status, notes, student_id, teacher_id, users!lessons_student_id_fkey(name, instrument)')

  if (me.role === 'student') {
    query = query.eq('student_id', me.id)
  }
  if (start) query = query.gte('start_datetime', start)
  if (end) query = query.lte('start_datetime', end)
  if (teacherFilter) query = query.eq('teacher_id', teacherFilter)

  const { data } = await query.order('start_datetime')

  type UserRow = { name: string; instrument: unknown }
  const events = (data ?? []).map((l) => {
    const student = l.users as UserRow | null
    return {
      id: l.id,
      title: `${l.title} — ${student?.name ?? 'Aluno'}`,
      start: l.start_datetime,
      end: l.end_datetime,
      backgroundColor: eventColor(student?.instrument, l.status),
      borderColor: 'transparent',
      textColor: '#1F2937',
      extendedProps: {
        student_id: l.student_id,
        teacher_id: l.teacher_id,
        status: l.status,
        notes: l.notes,
        student_name: student?.name ?? '',
        instrument: student?.instrument,
      },
    }
  })

  return NextResponse.json(events)
}
