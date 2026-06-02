// Adapter de email — Resend. Sem RESEND_API_KEY o adapter loga e retorna ok
// (modo dev: facilita desenvolvimento sem precisar de conta/domínio verificado).

export type EmailResult = { ok: true } | { ok: false; error: string }

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}

const DEFAULT_FROM = 'Sonorum <no-reply@sonorum.com.br>'

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY
  const from = input.from || process.env.RESEND_FROM || DEFAULT_FROM

  if (!key) {
    // Modo dev: registra e marca como sucesso (sem provider configurado).
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[email:mock] → ${input.to} · ${input.subject}`)
    }
    return { ok: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'erro desconhecido' }
  }
}
