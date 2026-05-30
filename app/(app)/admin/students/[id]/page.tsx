import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { StudentGoals } from '@/components/admin/StudentGoals'
import { StudentNotes } from '@/components/admin/StudentNotes'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { deleteStudent } from '@/lib/actions/students'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'Ativo', tone: 'success' },
  paused: { label: 'Pausado', tone: 'warning' },
  inactive: { label: 'Inativo', tone: 'neutral' },
}

function instrumentLabel(instrument: unknown): string {
  if (Array.isArray(instrument)) return instrument.join(', ') || '—'
  if (typeof instrument === 'string') return instrument
  return '—'
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('users')
    .select('id, name, email, phone, parent_contact, address, instrument, instrument_category, status, monthly_fee, due_day')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle()

  if (!student) notFound()

  const [{ data: goals }, { data: notes }] = await Promise.all([
    supabase.from('student_goals').select('id, text, completed').eq('student_id', id).order('created_at'),
    supabase.from('student_notes').select('id, content, date').eq('user_id', id).order('date', { ascending: false }),
  ])

  const st = STATUS[student.status] ?? { label: student.status, tone: 'neutral' as const }

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={student.email}
        action={
          <DeleteButton
            action={deleteStudent}
            hidden={{ studentId: student.id }}
            label="Excluir aluno"
            confirmText={`Excluir ${student.name}? Metas, anotações e acesso serão removidos.`}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Perfil</h2>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Telefone" value={student.phone} />
              <Row label="Responsável" value={student.parent_contact} />
              <Row label="Categoria" value={student.instrument_category} />
              <Row label="Instrumento" value={instrumentLabel(student.instrument)} />
              <Row label="Mensalidade" value={student.monthly_fee ? formatBRL(Number(student.monthly_fee)) : '—'} />
              <Row label="Vencimento" value={student.due_day ? `Dia ${student.due_day}` : '—'} />
            </dl>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <StudentGoals studentId={student.id} goals={goals ?? []} />
          <StudentNotes studentId={student.id} notes={notes ?? []} />
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value || '—'}</dd>
    </div>
  )
}
