import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/app/PageHeader'
import { GoogleCalendarConnect } from '@/components/app/GoogleCalendarConnect'
import { DeleteAccountForm } from '@/components/profile/DeleteAccountForm'
import { PasswordForm } from '@/components/profile/PasswordForm'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { TeachingToggle } from '@/components/profile/TeachingToggle'
import { Card } from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/session'
import { isGoogleCalendarEnabled } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Meu perfil' }

export default async function ProfilePage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const [{ data }, { data: teacherRow }] = await Promise.all([
    supabase.from('users').select('phone').eq('id', me.id).single(),
    me.role === 'admin'
      ? supabase.from('teachers').select('instruments').eq('user_id', me.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const gcalEnabled = isGoogleCalendarEnabled()
  const { data: gcalConn } = gcalEnabled
    ? await supabase
        .from('google_calendar_connections')
        .select('id')
        .eq('user_id', me.id)
        .eq('provider', 'google')
        .is('revoked_at', null)
        .maybeSingle()
    : { data: null }

  return (
    <>
      <PageHeader title="Meu perfil" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="sn-card-title mb-5">Dados pessoais</h2>
          <ProfileForm user={{ name: me.name, email: me.email ?? '', phone: data?.phone ?? null }} />
        </Card>

        <Card>
          <h2 className="sn-card-title mb-5">Alterar senha</h2>
          <PasswordForm />
        </Card>

        {me.role === 'admin' && (
          <Card className="lg:col-span-2">
            <TeachingToggle isTeacher={me.isTeacher} instruments={teacherRow?.instruments as string[] | null} />
          </Card>
        )}

        <div className="lg:col-span-2">
          <GoogleCalendarConnect enabled={gcalEnabled} connected={Boolean(gcalConn)} />
        </div>

        <Card className="lg:col-span-2">
          <h2 className="sn-card-title mb-2">Excluir conta</h2>
          {me.role === 'admin' ? (
            <p className="m-0 text-[15px] text-(--sn-text-muted)">
              Peça a exclusão da conta da escola pelo <a href="mailto:suporte@sonorum.com.br" className="font-medium text-(--sn-ink) underline underline-offset-2">suporte@sonorum.com.br</a>, para exportarmos os dados dos alunos com segurança.
          </p>
          ) : (
            <>
              <p className="mt-0 mb-4 text-[15px] text-(--sn-text-muted)">Seus dados são apagados de vez.</p>
              <DeleteAccountForm />
            </>
          )}
        </Card>
      </div>
    </>
  )
}
