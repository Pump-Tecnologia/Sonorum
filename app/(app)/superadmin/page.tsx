import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyRow, Table, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { createClient } from '@/lib/supabase/server'

const PLAN_LABEL: Record<string, string> = {
  free: 'Essencial',
  professional: 'Profissional',
  premium: 'Premium',
}

export const metadata = { title: 'Escolas' }

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, custom_name, plan_type, created_at')
    .order('created_at', { ascending: false })

  const list = schools ?? []

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
            <Th className="text-right">Criada em</Th>
          </Tr>
        </Thead>
        <tbody>
          {list.length === 0 && <EmptyRow colSpan={3}>Nenhuma escola ainda.</EmptyRow>}
          {list.map((s) => (
            <Tr key={s.id}>
              <Td className="font-medium">{s.custom_name || s.name}</Td>
              <Td>
                <Badge tone={s.plan_type === 'free' ? 'neutral' : 'brand'}>
                  {PLAN_LABEL[s.plan_type] ?? s.plan_type}
                </Badge>
              </Td>
              <Td className="text-right text-ink-muted">
                {new Date(s.created_at).toLocaleDateString('pt-BR')}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}
