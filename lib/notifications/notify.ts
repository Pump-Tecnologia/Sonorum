import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'
import { planFeatures } from '@/lib/constants/plans'
import { sendEmail } from '@/lib/notifications/email'
import { TEMPLATES } from '@/lib/notifications/templates'
import type { NotificationEvent, NotificationPayload, NotifyTo } from '@/lib/notifications/types'
import { waLink } from '@/lib/notifications/whatsapp'
import { getWhatsAppProvider, isWhatsAppCloudEnabled } from '@/lib/notifications/whatsapp-cloud'
import { WHATSAPP_TEMPLATES } from '@/lib/notifications/whatsapp-templates'

interface Recipient {
  userId: string | null
  name: string | null
  email: string | null
  phone: string | null
  label: 'aluno' | 'responsável'
}

export interface NotifyResult {
  email: { sent: number; failed: number; skipped: number }
  // links = wa.me manual (clique humano). sent/failed = envio automático Cloud API.
  whatsapp: { links: Array<{ to: Recipient['label']; name: string | null; url: string }>; sent: number; failed: number; skipped: number }
}

interface NotifyOptions {
  schoolId?: string | null
  relatedId?: string | null
  // Override do destinatário (cron/scripts) — senão lê de users.notify_to.
  notifyTo?: NotifyTo
  // Por padrão envia em ambos os canais. Útil pra silenciar um deles.
  channels?: Array<'email' | 'whatsapp'>
}

const DEFAULT_CHANNELS: Array<'email' | 'whatsapp'> = ['email', 'whatsapp']

// Resolve destinatários do aluno conforme users.notify_to.
async function resolveRecipients(
  studentId: string,
  override?: NotifyTo,
): Promise<{ recipients: Recipient[]; schoolId: string | null; studentName: string; schoolName: string | null; brandPrimary: string | null; logoUrl: string | null; whatsappOfficial: boolean }> {
  const admin = await createAdminClient()
  const { data: student } = await admin
    .from('users')
    .select('id, name, email, phone, parent_contact, notify_to, school_id, schools(name, custom_name, brand_primary, logo_path, plan_type)')
    .eq('id', studentId)
    .maybeSingle()

  if (!student) {
    return { recipients: [], schoolId: null, studentName: '', schoolName: null, brandPrimary: null, logoUrl: null, whatsappOfficial: false }
  }

  const target = (override ?? (student.notify_to as NotifyTo | null) ?? 'both')
  const school = (student.schools ?? null) as { name: string; custom_name: string | null; brand_primary: string | null; logo_path: string | null; plan_type: string | null } | null

  const recipients: Recipient[] = []
  if (target === 'student' || target === 'both') {
    recipients.push({ userId: student.id, name: student.name, email: student.email, phone: student.phone, label: 'aluno' })
  }
  if (target === 'parent' || target === 'both') {
    // parent_contact pode ter telefone ou email — heurística simples.
    const pc = (student.parent_contact ?? '').trim()
    if (pc) {
      const isEmail = /@/.test(pc)
      recipients.push({
        userId: null,
        name: 'Responsável',
        email: isEmail ? pc : null,
        phone: isEmail ? null : pc,
        label: 'responsável',
      })
    }
  }

  return {
    recipients,
    schoolId: student.school_id ?? null,
    studentName: student.name ?? '',
    schoolName: school?.custom_name || school?.name || null,
    brandPrimary: school?.brand_primary ?? null,
    logoUrl: school?.logo_path ?? null,
    // Envio automático pelo WhatsApp oficial só vale no Premium.
    whatsappOfficial: planFeatures(school?.plan_type).whatsappOfficial,
  }
}

// Orquestrador único. Resolve destinatário, renderiza template, loga, despacha.
// Para WhatsApp (wa.me): retorna URLs pra UI abrir manualmente (não automatiza).
export async function notify(
  event: NotificationEvent,
  studentId: string,
  payload: NotificationPayload = {},
  options: NotifyOptions = {},
): Promise<NotifyResult> {
  const admin = await createAdminClient()
  const { recipients, schoolId, studentName, schoolName, brandPrimary, logoUrl, whatsappOfficial } = await resolveRecipients(studentId, options.notifyTo)

  // Enriquecimento do payload (template usa essas chaves).
  const fullPayload: NotificationPayload = {
    studentName,
    schoolName,
    brandPrimary,
    logoUrl,
    ...payload,
  }

  const tpl = TEMPLATES[event]
  const channels = options.channels ?? DEFAULT_CHANNELS
  const result: NotifyResult = {
    email: { sent: 0, failed: 0, skipped: 0 },
    whatsapp: { links: [], sent: 0, failed: 0, skipped: 0 },
  }

  // Envio automático pelo WhatsApp oficial: só Premium + credenciais Cloud
  // configuradas + template aprovado pro evento. Senão, cai no wa.me manual.
  const cloudTemplate = WHATSAPP_TEMPLATES[event]
  const useCloud = whatsappOfficial && isWhatsAppCloudEnabled() && Boolean(cloudTemplate)
  const whatsappProvider = useCloud ? getWhatsAppProvider() : null

  type LogRow = {
    school_id: string | null
    event: string
    recipient_user_id: string | null
    recipient_phone: string | null
    recipient_email: string | null
    channel: 'email' | 'whatsapp'
    status: 'sent' | 'failed' | 'skipped' | 'queued'
    payload: NotificationPayload
    related_id: string | null
    error: string | null
    sent_at: string | null
  }

  const logs: LogRow[] = []
  const now = () => new Date().toISOString()

  for (const r of recipients) {
    const recipientPayload: NotificationPayload = { ...fullPayload, recipientName: r.name ?? studentName }

    if (channels.includes('email')) {
      if (!r.email) {
        result.email.skipped++
        logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: null, recipient_email: null, channel: 'email', status: 'skipped', payload: recipientPayload, related_id: options.relatedId ?? null, error: 'sem email', sent_at: null })
      } else {
        const { html, text } = tpl.email(recipientPayload)
        const subject = tpl.subject(recipientPayload)
        const r1 = await sendEmail({ to: r.email, subject, html, text })
        if (r1.ok) {
          result.email.sent++
          logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: null, recipient_email: r.email, channel: 'email', status: 'sent', payload: recipientPayload, related_id: options.relatedId ?? null, error: null, sent_at: now() })
        } else {
          result.email.failed++
          logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: null, recipient_email: r.email, channel: 'email', status: 'failed', payload: recipientPayload, related_id: options.relatedId ?? null, error: r1.error, sent_at: null })
        }
      }
    }

    if (channels.includes('whatsapp')) {
      if (useCloud && whatsappProvider && cloudTemplate) {
        // Premium + Cloud API: envia o template automaticamente (sem clique humano).
        if (!r.phone) {
          result.whatsapp.skipped++
          logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: null, recipient_email: null, channel: 'whatsapp', status: 'skipped', payload: recipientPayload, related_id: options.relatedId ?? null, error: 'sem telefone', sent_at: null })
        } else {
          const send = await whatsappProvider.sendTemplate({
            to: r.phone,
            template: cloudTemplate,
            variables: cloudTemplate.variables(recipientPayload),
          })
          if (send.ok) {
            result.whatsapp.sent++
            logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: r.phone, recipient_email: null, channel: 'whatsapp', status: 'sent', payload: recipientPayload, related_id: options.relatedId ?? null, error: null, sent_at: now() })
          } else {
            result.whatsapp.failed++
            logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: r.phone, recipient_email: null, channel: 'whatsapp', status: 'failed', payload: recipientPayload, related_id: options.relatedId ?? null, error: send.error ?? 'falha no envio', sent_at: null })
          }
        }
      } else {
        // Fallback: link wa.me (clique humano). Não confirma entrega → 'queued'.
        const msg = tpl.whatsapp(recipientPayload)
        const url = waLink(r.phone, msg)
        if (!url) {
          result.whatsapp.skipped++
          logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: null, recipient_email: null, channel: 'whatsapp', status: 'skipped', payload: recipientPayload, related_id: options.relatedId ?? null, error: 'sem telefone', sent_at: null })
        } else {
          result.whatsapp.links.push({ to: r.label, name: r.name, url })
          logs.push({ school_id: schoolId, event, recipient_user_id: r.userId, recipient_phone: r.phone, recipient_email: null, channel: 'whatsapp', status: 'queued', payload: recipientPayload, related_id: options.relatedId ?? null, error: null, sent_at: null })
        }
      }
    }
  }

  if (logs.length > 0) {
    await admin.from('notifications').insert(logs)
  }

  return result
}
