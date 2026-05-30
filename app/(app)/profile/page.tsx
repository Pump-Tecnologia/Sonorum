import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteAccountForm } from '@/components/profile/DeleteAccountForm'
import { PasswordForm } from '@/components/profile/PasswordForm'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Meu perfil' }

export default async function ProfilePage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const { data } = await supabase.from('users').select('phone').eq('id', me.id).single()

  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Atualize seus dados e senha" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Dados pessoais</h2>
          <ProfileForm user={{ name: me.name, email: me.email ?? '', phone: data?.phone ?? null }} />
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Alterar senha</h2>
          <PasswordForm />
        </Card>

        <Card className="lg:col-span-2 border-red-200">
          <h2 className="mb-2 text-base font-semibold text-ink">Zona de perigo</h2>
          <p className="mb-4 text-sm text-ink-muted">
            Ao excluir sua conta, todos os seus dados serão removidos permanentemente.
          </p>
          <DeleteAccountForm />
        </Card>
      </div>
    </>
  )
}
