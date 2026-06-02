import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

// Paleta por instrumento/status: cada evento ganha um fundo suave (bg) e uma
// cor de acento sólida (accent) usada na barra lateral e no texto da hora.
interface EventPalette { bg: string; accent: string }

function eventPalette(instrument: unknown, status: string): EventPalette {
  if (status === 'completed') return { bg: '#ECFDF5', accent: '#059669' }
  if (status === 'missed') return { bg: '#FEF2F2', accent: '#DC2626' }
  if (status === 'late') return { bg: '#FFFBEB', accent: '#D97706' }
  const instr = String(Array.isArray(instrument) ? instrument[0] : instrument ?? '').toLowerCase()
  if (/piano|teclado/.test(instr)) return { bg: '#EFF6FF', accent: '#2563EB' }
  if (/violão|guitarra/.test(instr)) return { bg: '#FFFBEB', accent: '#D97706' }
  if (/violino|cordas/.test(instr)) return { bg: '#ECFDF5', accent: '#059669' }
  if (/canto|voz/.test(instr)) return { bg: '#FDF2F8', accent: '#DB2777' }
  if (/bateria|percussão/.test(instr)) return { bg: '#F5F3FF', accent: '#7C3AED' }
  return { bg: '#EEF2FF', accent: '#4F46E5' }
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
    .select('id, title, start_datetime, end_datetime, status, notes, student_id, teacher_id, users!lessons_student_id_fkey(name, instrument), room:rooms(name)')

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

  type UserRow = { name: string; instrument: unknown }
  const events = (data ?? []).map((l) => {
    const student = l.users as UserRow | null
    const pal = eventPalette(student?.instrument, l.status)
    return {
      id: l.id,
      title: `${l.title} — ${student?.name ?? 'Aluno'}`,
      start: l.start_datetime,
      end: l.end_datetime,
      backgroundColor: pal.bg,
      borderColor: pal.accent,
      textColor: '#1F2937',
      extendedProps: {
        student_id: l.student_id,
        teacher_id: l.teacher_id,
        status: l.status,
        notes: l.notes,
        student_name: student?.name ?? '',
        instrument: student?.instrument,
        room: (l.room as { name: string } | null)?.name ?? '',
        accent: pal.accent,
      },
    }
  })

  return NextResponse.json(events)
}
