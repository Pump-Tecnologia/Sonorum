import 'server-only'

import { normalizePhone } from '@/lib/notifications/whatsapp'
import type { WhatsAppTemplate } from '@/lib/notifications/whatsapp-templates'

// Provider plugável de WhatsApp, no mesmo padrão de pagamentos/transcrição:
//   - 'manual' (default): NÃO envia nada (o fluxo cai no link wa.me, clique humano).
//   - 'cloud'  (por env): envia template via WhatsApp Cloud API da Meta, usando
//     o NÚMERO OFICIAL ÚNICO do Sonorum (um WABA pra todas as escolas).
//
// O recurso de envio automático é exclusivo do Premium — o gating fica em quem
// chama (notify()), não aqui. Sem as credenciais, o provider é 'manual' e tudo
// segue funcionando como hoje.

export interface WhatsAppSendRequest {
  to: string // telefone do destinatário (será normalizado p/ E.164 sem '+')
  template: WhatsAppTemplate
  variables: string[]
}

export interface WhatsAppSendResult {
  ok: boolean
  // true quando o provider não envia sozinho (manual) — o caller usa o wa.me.
  manual: boolean
  providerMessageId?: string | null
  error?: string
}

export interface WhatsAppProvider {
  readonly name: 'manual' | 'cloud'
  sendTemplate(req: WhatsAppSendRequest): Promise<WhatsAppSendResult>
}

// Provider manual: não envia (degrada pro wa.me).
function manualProvider(): WhatsAppProvider {
  return {
    name: 'manual',
    async sendTemplate(): Promise<WhatsAppSendResult> {
      return { ok: false, manual: true }
    },
  }
}

// Provider real: Cloud API da Meta. Um token + um phone_number_id (número único
// do Sonorum) atendem todas as escolas.
function cloudProvider(token: string, phoneNumberId: string): WhatsAppProvider {
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0'
  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  return {
    name: 'cloud',
    async sendTemplate({ to, template, variables }: WhatsAppSendRequest): Promise<WhatsAppSendResult> {
      const phone = normalizePhone(to)
      if (!phone) return { ok: false, manual: false, error: 'Telefone inválido para WhatsApp.' }

      const body = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: variables.length
            ? [{ type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) }]
            : [],
        },
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json().catch(() => ({}))) as {
          messages?: Array<{ id?: string }>
          error?: { message?: string }
        }
        if (!res.ok) {
          return { ok: false, manual: false, error: json.error?.message ?? `Cloud API ${res.status}` }
        }
        return { ok: true, manual: false, providerMessageId: json.messages?.[0]?.id ?? null }
      } catch (e) {
        return { ok: false, manual: false, error: e instanceof Error ? e.message : 'Falha ao enviar pelo WhatsApp.' }
      }
    },
  }
}

// Liga o provider cloud só se as credenciais existirem e não estiver forçado manual.
export function isWhatsAppCloudEnabled(): boolean {
  if (process.env.WHATSAPP_PROVIDER === 'manual') return false
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (isWhatsAppCloudEnabled()) {
    return cloudProvider(process.env.WHATSAPP_TOKEN as string, process.env.WHATSAPP_PHONE_NUMBER_ID as string)
  }
  return manualProvider()
}
