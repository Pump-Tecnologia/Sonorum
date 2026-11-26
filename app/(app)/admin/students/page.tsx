import Link from 'next/link'

import { Avatar } from '@/components/ds/Avatar'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight, IconPlus, IconUpload } from '@/components/ds/icons'
import { MoreMenu } from '@/components/ds/MoreMenu'
import { StatusPill } from '@/components/ds/StatusPill'
import dsStyles from '@/components/ds/ds.module.css'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton'
import { StudentSearch } from '@/components/admin/StudentSearch'
import styles from '@/components/admin/students.module.css'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import type { StatusTone } from '@/lib/constants/lessons'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Alunos' }

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

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const term = (q ?? '').trim()
  const supabase = await createClient()

  let query = supabase
    .from('users')
    .select('id, name, email, instrument, status')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`)

  const { data } = await query
  const students = data ?? []

  // Plano da matrícula ativa de cada aluno (valor personalizado sobrescreve o plano).
  const ids = students.map((s) => s.id)
  const planByStudent = new Map<string, { name: string; amount: number }>()
  if (ids.length) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id, custom_amount, plan:plans(name, amount)')
      .eq('status', 'active')
      .in('student_id', ids)
    for (const e of enrollments ?? []) {
      const plan = e.plan as { name: string; amount: number } | null
      if (!plan) continue
      planByStudent.set(e.student_id, {
        name: plan.name,
        amount: e.custom_amount != null ? Number(e.custom_amount) : Number(plan.amount),
      })
    }
  }

  const count = `${students.length} ${students.length === 1 ? 'aluno' : 'alunos'}`

  return (
    <section className={styles.page} aria-labelledby="students-title">
      <header className={styles.header}>
        <div>
          <h1 id="students-title" className={styles.kicker}>Alunos</h1>
          <p className={styles.count}>{term ? `${count} para “${term}”` : count}</p>
        </div>
        <div className={styles.actions}>
          <LinkButton href="/admin/students/import" variant="soft"><IconUpload /> Importar</LinkButton>
          <LinkButton href="/admin/students/new"><IconPlus /> Novo aluno</LinkButton>
        </div>
      </header>

      <StudentSearch defaultValue={term} />

      {students.length === 0 ? (
        <p className={styles.empty}>
          {term ? 'Nenhum aluno com esse nome ou e-mail.' : 'Nenhum aluno cadastrado ainda.'}
        </p>
      ) : (
        <ul className={styles.list} aria-label="Lista de alunos">
          <li className={styles.columns} aria-hidden="true">
            <span>Aluno</span><span>Instrumento</span><span>Plano</span><span>Status</span><span />
          </li>
          {students.map((s) => {
            const st = STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const }
            const plan = planByStudent.get(s.id)
            const instrument = instrumentLabel(s.instrument)
            const href = `/admin/students/${s.id}`
            return (
              <li key={s.id} className={styles.row}>
                <div className={styles.who}>
                  <Avatar name={s.name} tone={instrumentTone(s.instrument)} />
                  <div className={styles.identity}>
                    {/* O link do nome cobre a linha inteira: clicar em qualquer ponto abre a ficha. */}
                    <Link href={href} className={styles.rowLink}>{s.name}</Link>
                    <span className={styles.email}>{s.email}</span>
                  </div>
                </div>
                <div className={styles.cell} data-label="Instrumento">{instrument || <span className={styles.none}>Sem instrumento</span>}</div>
                <div className={styles.cell} data-label="Plano">
                  {plan ? (
                    <>
                      <span>{plan.name}</span>
                      <span className={styles.amount}>{formatBRL(plan.amount)}</span>
                    </>
                  ) : (
                    <span className={styles.none}>Sem plano</span>
                  )}
                </div>
                <div className={styles.cell} data-label="Status"><StatusPill tone={st.tone}>{st.label}</StatusPill></div>
                <div className={styles.rowActions}>
                  <span className={styles.open} aria-hidden="true">Ver ficha <IconArrowRight /></span>
                  <MoreMenu label={`Mais ações para ${s.name}`}>
                    <ResetPasswordButton userId={s.id} userName={s.name} className={dsStyles.menuItem} />
                    <ImpersonateButton targetUserId={s.id} label="Entrar como este aluno" className={dsStyles.menuItem} />
                  </MoreMenu>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
