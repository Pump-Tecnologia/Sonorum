import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { createAdminClient } from '@/lib/supabase/server'

const PLAN_LABEL: Record<string, string> = {
  free: 'Essencial',
  professional: 'Profissional',
  premium: 'Premium',
}

export const metadata = { title: 'Escolas' }

interface SchoolRow {
  id: string
  name: string
  custom_name: string | null
  plan_type: string
  created_at: string
  users: { id: string; name: string }[]
}

export default async function SuperAdminDashboard() {
  // service-role: bypassa RLS para listar escolas + buscar o admin de cada uma
  const admin = await createAdminClient()
  const { data: schools } = await admin
    .from('schools')
    .select('id, name, custom_name, plan_type, created_at, users!inner(id, name, role)')
    .eq('users.role', 'admin')
    .order('created_at', { ascending: false })

  const list = (schools ?? []) as unknown as SchoolRow[]

  return (
    <>
      <PageHeader
        title="Escolas"
        subtitle={`${list.length} escola(s) na plataforma`}
        action={
          <Link href="/superadmin/schools/new">
            <Button>Nova escola</Button>
          </Link>
        }
      />

      <Table>
        <Thead>
          <Tr>
            <Th>Escola</Th>
            <Th>Plano</Th>
            <Th>Criada em</Th>
            <Th className="text-right"></Th>
          </Tr>
        </Thead>
        <tbody>
          {list.length === 0 && <EmptyRow colSpan={4}>Nenhuma escola ainda.</EmptyRow>}
          {list.map((s) => {
            const admin = s.users?.[0] // admin da escola
            return (
              <Tr key={s.id}>
                <Td>
                  <span className="font-medium">{s.custom_name || s.name}</span>
                  {admin && <span className="block text-xs text-ink-muted">Admin: {admin.name}</span>}
                </Td>
                <Td>
                  <Badge tone={s.plan_type === 'free' ? 'neutral' : 'brand'}>
                    {PLAN_LABEL[s.plan_type] ?? s.plan_type}
                  </Badge>
                </Td>
                <Td className="text-ink-muted">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </Td>
                <Td className="text-right">
                  {admin && <ImpersonateButton targetUserId={admin.id} label="Entrar como admin" />}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </>
  )
}
