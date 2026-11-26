import 'server-only'

import { sendEmail, type EmailResult } from '@/lib/notifications/email'
import { escapeHtml } from '@/lib/notifications/escape-html'
import { appBaseUrl } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

interface CredentialsEmailInput {
  admin: AdminClient
  to: string
  name: string | null
  schoolName: string | null
  kind: 'new' | 'reset'
}

// Gera um token de recuperação e entrega somente um link de uso único; senha
// temporária nunca é exibida na interface nem enviada por e-mail.
export async function sendCredentialsEmail({ admin, to, name, schoolName, kind }: CredentialsEmailInput): Promise<EmailResult> {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: to })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) return { ok: false, error: 'Não foi possível gerar o link de definição de senha.' }

  const setupUrl = new URL('/auth/callback', appBaseUrl())
  setupUrl.searchParams.set('token_hash', tokenHash)
  setupUrl.searchParams.set('type', 'recovery')
  setupUrl.searchParams.set('next', '/reset-password')

  const school = schoolName || 'sua escola'
  const greeting = `Olá${name ? `, ${name}` : ''}!`
  const subject = kind === 'reset' ? `Defina uma nova senha — ${school}` : `Seu acesso a ${school}`
  const intro = kind === 'reset'
    ? `O administrador solicitou a redefinição da senha da sua conta em ${school}. Use o link abaixo para escolher uma nova senha:`
    : `Sua conta em ${school} foi criada. Use o link abaixo para definir sua senha e acessar o Sonorum:`

  const safeGreeting = escapeHtml(greeting)
  const safeIntro = escapeHtml(intro)
  const safeTo = escapeHtml(to)
  const safeSchool = escapeHtml(school)
  const safeSetupUrl = escapeHtml(setupUrl.toString())
  const text = `${greeting}\n\n${intro}\n\nE-mail: ${to}\nDefinir senha: ${setupUrl}\n\nSe você não esperava esta mensagem, ignore-a.\n\n${school} usa o Sonorum para enviar estes avisos.`
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f8f5;font-family:system-ui,sans-serif;color:#1c362e">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:32px">
      <p>${safeGreeting}</p>
      <p>${safeIntro}</p>
      <p style="font-size:14px">E-mail de acesso: <strong>${safeTo}</strong></p>
      <a href="${safeSetupUrl}" style="display:inline-block;background:#25463c;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Definir minha senha</a>
      <p style="margin-top:16px;font-size:12px;color:#5c7568">Se você não esperava esta mensagem, ignore-a.</p>
      <hr style="border:none;border-top:1px solid #e3ece6;margin:20px 0">
      <div style="font-size:12px;color:#5c7568">${safeSchool} usa o Sonorum para enviar estes avisos.</div>
    </div>
  </div></body></html>`

  return sendEmail({ to, subject, html, text })
}
