import { PageHeader } from '@/components/app/PageHeader'
import { AppBadge } from '@/components/app/AppBadge'
import { AppLinkButton } from '@/components/app/AppButton'
import {
  AppEmpty,
  AppTable,
  cellMuted,
  cellPrimary,
  cellSub,
  tableRight,
} from '@/components/app/AppTable'
import { ImpersonateButton } from '@/components/admin/ImpersonateButton'
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
        action={<AppLinkButton href="/superadmin/schools/new">Nova escola</AppLinkButton>}
      />

      <AppTable>
        <thead>
          <tr>
            <th>Escola</th>
            <th>Plano</th>
            <th>Criada em</th>
            <th className={tableRight} />
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && <AppEmpty colSpan={4}>Nenhuma escola ainda.</AppEmpty>}
          {list.map((s) => {
            const admin = s.users?.[0]
            return (
              <tr key={s.id}>
                <td>
                  <span className={cellPrimary}>{s.custom_name || s.name}</span>
                  {admin && <span className={cellSub}>Admin: {admin.name}</span>}
                </td>
                <td>
                  <AppBadge tone={s.plan_type === 'free' ? 'neutral' : 'brand'}>
                    {PLAN_LABEL[s.plan_type] ?? s.plan_type}
                  </AppBadge>
                </td>
                <td className={cellMuted}>
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className={tableRight}>
                  {admin && <ImpersonateButton targetUserId={admin.id} label="Entrar como admin" />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </AppTable>
    </>
  )
}
