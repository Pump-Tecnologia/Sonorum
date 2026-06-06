import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton'
import { StudentSearch } from '@/components/admin/StudentSearch'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Alunos' }

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

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle={`${students.length} aluno(s)${term ? ` · busca: "${term}"` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/students/import">
              <Button variant="secondary">Importar</Button>
            </Link>
            <Link href="/admin/students/new">
              <Button>Novo aluno</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 max-w-sm">
        <StudentSearch defaultValue={term} />
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Instrumento</Th>
            <Th>Plano</Th>
            <Th>Status</Th>
            <Th className="text-right"></Th>
          </Tr>
        </Thead>
        <tbody>
          {students.length === 0 && (
            <EmptyRow colSpan={5}>{term ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</EmptyRow>
          )}
          {students.map((s) => {
            const st = STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const }
            const plan = planByStudent.get(s.id)
            return (
              <Tr key={s.id}>
                <Td>
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                  <span className="block text-xs text-ink-muted">{s.email}</span>
                </Td>
                <Td className="text-ink-muted">{instrumentLabel(s.instrument)}</Td>
                <Td className="text-ink-muted">
                  {plan ? (
                    <>
                      <span className="text-ink">{plan.name}</span>
                      <span className="block text-xs">{formatBRL(plan.amount)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <ResetPasswordButton userId={s.id} userName={s.name} />
                    <ImpersonateButton targetUserId={s.id} />
                  </div>
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
