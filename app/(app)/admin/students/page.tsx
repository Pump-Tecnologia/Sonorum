import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
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

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('id, name, email, instrument, status, monthly_fee')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  const students = data ?? []

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle={`${students.length} aluno(s)`}
        action={
          <Link href="/admin/students/new">
            <Button>Novo aluno</Button>
          </Link>
        }
      />

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Instrumento</Th>
            <Th>Mensalidade</Th>
            <Th>Status</Th>
            <Th className="text-right"></Th>
          </Tr>
        </Thead>
        <tbody>
          {students.length === 0 && <EmptyRow colSpan={5}>Nenhum aluno cadastrado.</EmptyRow>}
          {students.map((s) => {
            const st = STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const }
            return (
              <Tr key={s.id}>
                <Td>
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                  <span className="block text-xs text-ink-muted">{s.email}</span>
                </Td>
                <Td className="text-ink-muted">{instrumentLabel(s.instrument)}</Td>
                <Td className="text-ink-muted">{s.monthly_fee ? formatBRL(Number(s.monthly_fee)) : '—'}</Td>
                <Td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Td>
                <Td className="text-right">
                  <ImpersonateButton targetUserId={s.id} />
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
