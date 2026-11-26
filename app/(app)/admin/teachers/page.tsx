import Link from 'next/link'
import { redirect } from 'next/navigation'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton'
import { StudentSearch } from '@/components/admin/StudentSearch'
import styles from '@/components/admin/students.module.css'
import { Avatar } from '@/components/ds/Avatar'
import { LinkButton } from '@/components/ds/Button'
import { IconArrowRight, IconPlus, IconUpload } from '@/components/ds/icons'
import { MoreMenu } from '@/components/ds/MoreMenu'
import { StatusPill } from '@/components/ds/StatusPill'
import dsStyles from '@/components/ds/ds.module.css'
import { getPlanContext, isSoloExperience } from '@/lib/auth/plan'
import { deleteTeacher } from '@/lib/actions/teachers'
import { instrumentTone } from '@/lib/constants/instrument-tone'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Professores' }

// Professor | Instrumentos | Status | ações (uma coluna a menos que a lista de alunos).
const TEACHER_COLS = { '--cols': 'minmax(0, 2.2fr) minmax(0, 1.4fr) 100px 144px' } as React.CSSProperties

type TeacherRow = {
  id: string
  user_id: string
  status: string
  instruments: string[] | null
  user: { name: string; email: string } | null
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // Conta presa a 1 professor (Essencial, Solo, Solo Pro): não existe "equipe"
  // pra gerenciar aqui — o instrumento próprio se edita em /profile.
  const plan = await getPlanContext()
  if (isSoloExperience(plan)) redirect('/profile')

  const { q } = await searchParams
  const term = (q ?? '').trim()

  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('id, user_id, status, instruments, user:users(name, email)')
    .order('created_at', { ascending: false })

  const all = (data ?? []) as unknown as TeacherRow[]
  // Filtro por nome/e-mail (em memória — a relação está num join embutido).
  const teachers = term
    ? all.filter((t) => {
        const hay = `${t.user?.name ?? ''} ${t.user?.email ?? ''}`.toLowerCase()
        return hay.includes(term.toLowerCase())
      })
    : all

  const count = `${teachers.length} ${teachers.length === 1 ? 'professor' : 'professores'}`

  return (
    <section className={styles.page} aria-labelledby="teachers-title">
      <header className={styles.header}>
        <div>
          <h1 id="teachers-title" className={styles.kicker}>Professores</h1>
          <p className={styles.count}>{term ? `${count} para “${term}”` : count}</p>
        </div>
        <div className={styles.actions}>
          <LinkButton href="/admin/teachers/import" variant="soft"><IconUpload /> Importar</LinkButton>
          <LinkButton href="/admin/teachers/new"><IconPlus /> Novo professor</LinkButton>
        </div>
      </header>

      <StudentSearch defaultValue={term} basePath="/admin/teachers" label="Buscar professor" />

      {teachers.length === 0 ? (
        <p className={styles.empty}>
          {term ? 'Nenhum professor com esse nome ou e-mail.' : 'Nenhum professor cadastrado ainda.'}
        </p>
      ) : (
        <ul className={styles.list} style={TEACHER_COLS} aria-label="Lista de professores">
          <li className={styles.columns} aria-hidden="true">
            <span>Professor</span><span>Instrumentos</span><span>Status</span><span />
          </li>
          {teachers.map((t) => {
            const name = t.user?.name ?? 'Professor'
            const instruments = Array.isArray(t.instruments) ? t.instruments : []
            const active = t.status === 'active'
            return (
              <li key={t.id} className={styles.row}>
                <div className={styles.who}>
                  <Avatar name={name} tone={instrumentTone(instruments)} />
                  <div className={styles.identity}>
                    {/* O link do nome cobre a linha inteira: clicar em qualquer ponto abre a edição. */}
                    <Link href={`/admin/teachers/${t.id}/edit`} className={styles.rowLink}>{name}</Link>
                    <span className={styles.email}>{t.user?.email}</span>
                  </div>
                </div>
                <div className={styles.cell} data-label="Instrumentos">
                  {instruments.length ? instruments.join(', ') : <span className={styles.none}>Sem instrumento</span>}
                </div>
                <div className={styles.cell} data-label="Status">
                  <StatusPill tone={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</StatusPill>
                </div>
                <div className={styles.rowActions}>
                  <span className={styles.open} aria-hidden="true">Editar <IconArrowRight /></span>
                  <MoreMenu label={`Mais ações para ${name}`}>
                    <ResetPasswordButton userId={t.user_id} userName={name} className={dsStyles.menuItem} />
                    <ImpersonateButton targetUserId={t.user_id} label="Entrar como este professor" className={dsStyles.menuItem} />
                    <DeleteButton
                      action={deleteTeacher}
                      hidden={{ teacherId: t.id }}
                      label="Excluir professor"
                      confirmText={`Excluir ${name}? O acesso será removido.`}
                      buttonClassName={`${dsStyles.menuItem} ${dsStyles.menuItemDanger}`}
                    />
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
