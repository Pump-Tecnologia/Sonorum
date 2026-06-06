import 'server-only'

import { sendEmail, type EmailResult } from '@/lib/notifications/email'
import { appBaseUrl } from '@/lib/payments'

interface CredentialsEmailInput {
  to: string
  name: string | null
  password: string
  schoolName: string | null
  kind: 'new' | 'reset'
}

// Envia ao aluno/professor o acesso (senha gerada) por e-mail — usado na
// criação/importação (kind=new) e na redefinição pelo admin (kind=reset).
export async function sendCredentialsEmail({ to, name, password, schoolName, kind }: CredentialsEmailInput): Promise<EmailResult> {
  const loginUrl = `${appBaseUrl()}/login`
  const school = schoolName || 'sua escola'
  const greeting = `Olá${name ? `, ${name}` : ''}!`
  const subject = kind === 'reset' ? `Sua nova senha de acesso — ${school}` : `Seu acesso a ${school}`
  const intro = kind === 'reset'
    ? `A senha da sua conta em ${school} foi redefinida. Use os dados abaixo para entrar:`
    : `Sua conta em ${school} foi criada. Use os dados abaixo para entrar:`

  const text = `${greeting}\n\n${intro}\n\n• E-mail: ${to}\n• Senha: ${password}\n• Acesse: ${loginUrl}\n\nRecomendamos trocar a senha após o primeiro acesso.\n\n${school} · enviado pelo Sonorum`

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6fa;font-family:system-ui,sans-serif;color:#1F3A5F">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:32px">
      <p>${greeting}</p>
      <p>${intro}</p>
      <div style="margin:16px 0;border:1px solid #E4E8EF;border-radius:12px;padding:16px;font-size:14px">
        <div>E-mail: <strong>${to}</strong></div>
        <div style="margin-top:6px">Senha: <strong style="font-family:ui-monospace,monospace;letter-spacing:.04em">${password}</strong></div>
      </div>
      <a href="${loginUrl}" style="display:inline-block;background:#2b4c79;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">Entrar</a>
      <p style="margin-top:16px;font-size:12px;color:#6B7480">Recomendamos trocar a senha após o primeiro acesso.</p>
      <hr style="border:none;border-top:1px solid #E4E8EF;margin:20px 0">
      <div style="font-size:12px;color:#6B7480">${school} · enviado pelo Sonorum</div>
    </div>
  </div></body></html>`

  return sendEmail({ to, subject, html, text })
}
