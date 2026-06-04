import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { StudentEnrollment } from '@/components/admin/StudentEnrollment'
import { StudentGoals } from '@/components/admin/StudentGoals'
import { StudentNotes } from '@/components/admin/StudentNotes'
import { ProgressPanel } from '@/components/students/ProgressPanel'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deleteStudent } from '@/lib/actions/students'
import { sendStudentReport } from '@/lib/actions/notifications'
import { getPlanContext } from '@/lib/auth/plan'
import { getStudentProgress } from '@/lib/data/progress'
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
  const plan = await getPlanContext()

  const { data: student } = await supabase
    .from('users')
    .select('id, name, email, phone, parent_contact, address, instrument, instrument_category, status')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle()

  if (!student) notFound()

  const [{ data: goals }, { data: notes }, progress] = await Promise.all([
    supabase.from('student_goals').select('id, text, completed').eq('student_id', id).order('created_at'),
    supabase.from('student_notes').select('id, content, date').eq('user_id', id).order('date', { ascending: false }),
    getStudentProgress(id),
  ])

  // Matrícula e planos — só carrega se o plano da escola suportar financeiro
  let enrollment: Parameters<typeof StudentEnrollment>[0]['enrollment'] = null
  let plans: Parameters<typeof StudentEnrollment>[0]['plans'] = []

  if (plan.features.financial) {
    const [{ data: enr }, { data: plansData }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, status, due_day, custom_amount, plan:plans(id, name, amount, billing_type)')
        .eq('student_id', id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('plans').select('id, name, amount, billing_type').eq('active', true).order('amount'),
    ])
    enrollment = enr as typeof enrollment
    plans = (plansData ?? []) as typeof plans
  }

  const st = STATUS[student.status] ?? { label: student.status, tone: 'neutral' as const }

  return (
    <>
      <PageHeader
        title={student.name}
        subtitle={student.email}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/students/${student.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <DeleteButton
              action={deleteStudent}
              hidden={{ studentId: student.id }}
              label="Excluir"
              confirmText={`Excluir ${student.name}? Metas, anotações e acesso serão removidos.`}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna esquerda: perfil + matrícula */}
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
            </dl>
          </Card>

          {plan.features.financial ? (
            <StudentEnrollment
              studentId={student.id}
              enrollment={enrollment as Parameters<typeof StudentEnrollment>[0]['enrollment']}
              plans={plans as Parameters<typeof StudentEnrollment>[0]['plans']}
            />
          ) : (
            <Card className="border-dashed">
              <p className="text-sm font-medium text-ink">Matrícula</p>
              <p className="mt-1 text-sm text-ink-muted">
                Disponível a partir do plano Básico.{' '}
                <Link href="/upgrade" className="font-medium text-brand-600">
                  Fazer upgrade
                </Link>
              </p>
            </Card>
          )}
        </div>

        {/* Coluna direita: progresso + metas + notas */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Progresso do mês</h2>
            <WhatsAppNotifyButton
              action={sendStudentReport}
              hidden={{ studentId: student.id }}
              label="Enviar relatório ao aluno"
              title="Envia o resumo de aulas, frequência e metas por e-mail e WhatsApp"
            />
          </div>
          <ProgressPanel progress={progress} />
          <StudentGoals studentId={student.id} goals={(goals ?? []) as Parameters<typeof StudentGoals>[0]['goals']} />
          <StudentNotes studentId={student.id} notes={(notes ?? []) as Parameters<typeof StudentNotes>[0]['notes']} />
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
