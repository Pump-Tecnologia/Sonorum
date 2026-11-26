import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton'
import { StudentEnrollment } from '@/components/admin/StudentEnrollment'
import { StudentGoals } from '@/components/admin/StudentGoals'
import { StudentNotes } from '@/components/admin/StudentNotes'
import { Avatar } from '@/components/ds/Avatar'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowLeft } from '@/components/ds/icons'
import { MoreMenu } from '@/components/ds/MoreMenu'
import { StatusPill } from '@/components/ds/StatusPill'
import dsStyles from '@/components/ds/ds.module.css'
import { WhatsAppNotifyButton } from '@/components/notifications/WhatsAppNotifyButton'
import { ProgressPanel } from '@/components/students/ProgressPanel'
import styles from '@/components/students/student-profile.module.css'
import { deleteStudent } from '@/lib/actions/students'
import { sendStudentReport } from '@/lib/actions/notifications'
import { getPlanContext } from '@/lib/auth/plan'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import type { StatusTone } from '@/lib/constants/lessons'
import { getStudentProgress } from '@/lib/data/progress'
import { createClient } from '@/lib/supabase/server'

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: 'Ativo', tone: 'success' },
  paused: { label: 'Pausado', tone: 'warning' },
  inactive: { label: 'Inativo', tone: 'neutral' },
}

function instrumentLabel(instrument: unknown): string {
  if (Array.isArray(instrument)) return instrument.join(', ')
  if (typeof instrument === 'string') return instrument
  return ''
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
  const instrument = instrumentLabel(student.instrument)
  const tone = instrumentTone(student.instrument)

  return (
    <article className={styles.page} aria-labelledby="student-name">
      <Link href="/admin/students" className={styles.back}><IconArrowLeft /> Alunos</Link>

      {/* Quem é o aluno + ações */}
      <header className={`${styles.panel} ${styles.hero}`}>
        <div className={styles.heroWho}>
          <Avatar name={student.name} tone={tone} className={styles.heroAvatar} />
          <div>
            <h1 id="student-name" className={styles.heroName}>{student.name}</h1>
            <div className={styles.heroMeta}>
              <StatusPill tone={st.tone}>{st.label}</StatusPill>
              {instrument && <span className={styles.chip} data-tone={tone}>{instrument}</span>}
              <span>{student.email}</span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
          <WhatsAppNotifyButton
            action={sendStudentReport}
            hidden={{ studentId: student.id }}
            label="Enviar relatório"
            title="Envia o resumo de aulas, frequência e metas por e-mail e WhatsApp"
            className={dsStyles.heroSoftButton}
          />
          <LinkButton href={`/admin/students/${student.id}/edit`}>Editar dados</LinkButton>
          <MoreMenu label={`Mais ações para ${student.name}`}>
            <ResetPasswordButton userId={student.id} userName={student.name} className={dsStyles.menuItem} />
            <ImpersonateButton targetUserId={student.id} label="Entrar como este aluno" className={dsStyles.menuItem} />
            <DeleteButton
              action={deleteStudent}
              hidden={{ studentId: student.id }}
              label="Excluir aluno"
              confirmText={`Excluir ${student.name}? Metas, anotações e acesso serão removidos.`}
              buttonClassName={`${dsStyles.menuItem} ${dsStyles.menuItemDanger}`}
            />
          </MoreMenu>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Coluna esquerda: contato + matrícula */}
        <div className={styles.col}>
          <section className={styles.panel} aria-labelledby="contact-title">
            <div className={styles.panelHead}>
              <h2 id="contact-title" className={styles.panelTitle}>Contato</h2>
            </div>
            <dl className={styles.facts}>
              <Fact label="Telefone" value={student.phone} />
              <Fact label="Responsável" value={student.parent_contact} />
              <Fact label="Endereço" value={student.address} />
              <Fact label="Categoria" value={student.instrument_category} />
            </dl>
          </section>

          {plan.features.financial ? (
            <StudentEnrollment
              studentId={student.id}
              enrollment={enrollment as Parameters<typeof StudentEnrollment>[0]['enrollment']}
              plans={plans as Parameters<typeof StudentEnrollment>[0]['plans']}
            />
          ) : (
            <section className={`${styles.panel} ${styles.locked}`} aria-labelledby="enrollment-locked">
              <h2 id="enrollment-locked" className={styles.panelTitle}>Matrícula e mensalidade</h2>
              <p className={styles.empty}>
                Disponível a partir do plano Solo ou Profissional. <Link href="/upgrade" className={styles.link}>Ver planos</Link>
              </p>
            </section>
          )}
        </div>

        {/* Coluna direita: progresso + metas + anotações */}
        <div className={styles.col}>
          <ProgressPanel progress={progress} />
          <StudentGoals studentId={student.id} goals={(goals ?? []) as Parameters<typeof StudentGoals>[0]['goals']} />
          <StudentNotes studentId={student.id} notes={(notes ?? []) as Parameters<typeof StudentNotes>[0]['notes']} />
        </div>
      </div>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || <span className={styles.factsEmpty}>Não informado</span>}</dd>
    </div>
  )
}
