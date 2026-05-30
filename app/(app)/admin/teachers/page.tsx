import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { deleteTeacher } from '@/lib/actions/teachers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Professores' }

type TeacherRow = {
  id: string
  status: string
  instruments: string[] | null
  user: { name: string; email: string } | null
}

export default async function TeachersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('id, status, instruments, user:users(name, email)')
    .order('created_at', { ascending: false })

  const teachers = (data ?? []) as unknown as TeacherRow[]

  return (
    <>
      <PageHeader
        title="Professores"
        subtitle={`${teachers.length} professor(es)`}
        action={
          <Link href="/admin/teachers/new">
            <Button>Novo professor</Button>
          </Link>
        }
      />

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Instrumentos</Th>
            <Th>Status</Th>
            <Th className="text-right"></Th>
          </Tr>
        </Thead>
        <tbody>
          {teachers.length === 0 && <EmptyRow colSpan={5}>Nenhum professor cadastrado.</EmptyRow>}
          {teachers.map((t) => (
            <Tr key={t.id}>
              <Td className="font-medium">{t.user?.name ?? '—'}</Td>
              <Td className="text-ink-muted">{t.user?.email ?? '—'}</Td>
              <Td className="text-ink-muted">
                {Array.isArray(t.instruments) && t.instruments.length
                  ? t.instruments.join(', ')
                  : '—'}
              </Td>
              <Td>
                <Badge tone={t.status === 'active' ? 'success' : 'neutral'}>
                  {t.status === 'active' ? 'Ativo' : t.status}
                </Badge>
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/admin/teachers/${t.id}/edit`}>
                    <Button variant="ghost" className="text-xs px-2 py-1">Editar</Button>
                  </Link>
                  <DeleteButton
                    action={deleteTeacher}
                    hidden={{ teacherId: t.id }}
                    label="Excluir"
                    confirmText={`Excluir ${t.user?.name ?? 'professor'}? O acesso será removido.`}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
