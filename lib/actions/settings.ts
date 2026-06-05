'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { deleteSchoolLogo, uploadSchoolLogo } from '@/lib/storage/branding'

const settingsSchema = z.object({
  customName: z.string().max(255).optional(),
  brandPrimary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use #rrggbb)')
    .optional()
    .or(z.literal('')),
  brandSecondary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use #rrggbb)')
    .optional()
    .or(z.literal('')),
  // Chave PIX da escola (recebedora) — disponível em TODOS os planos.
  pixKey: z.string().max(77, 'Chave PIX muito longa').optional().or(z.literal('')),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional().or(z.literal('')),
  pixCity: z.string().max(30, 'Cidade muito longa').optional().or(z.literal('')),
})

export type SettingsActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function updateSchoolSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const parsed = settingsSchema.safeParse({
    customName: formData.get('customName') || undefined,
    brandPrimary: formData.get('brandPrimary') || '',
    brandSecondary: formData.get('brandSecondary') || '',
    pixKey: formData.get('pixKey') || '',
    pixKeyType: formData.get('pixKeyType') || '',
    pixCity: formData.get('pixCity') || '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])),
    }
  }

  const d = parsed.data
  const supabase = await createClient()

  // Nome exibido é livre; logo e cores são exclusivos do Premium (branding).
  // Chave PIX é livre (todos os planos) — habilita a cobrança avulsa no PIX.
  type SchoolUpdate = {
    custom_name: string | null
    pix_key: string | null
    pix_key_type: string | null
    pix_city: string | null
    brand_primary?: string | null
    brand_secondary?: string | null
    logo_path?: string | null
  }
  const update: SchoolUpdate = {
    custom_name: d.customName || null,
    pix_key: d.pixKey || null,
    pix_key_type: d.pixKey ? d.pixKeyType || null : null,
    pix_city: d.pixCity || null,
  }

  const { features } = await getPlanContext()
  if (features.branding) {
    update.brand_primary = d.brandPrimary || null
    update.brand_secondary = d.brandSecondary || null

    const { data: cur } = await supabase.from('schools').select('logo_path').eq('id', me.schoolId).maybeSingle()
    const file = formData.get('logo')
    const hasNewFile = file instanceof File && file.size > 0
    const removingLogo = formData.get('removeLogo') === 'on'
    // Estado final da logo após esta submissão.
    const willHaveLogo = hasNewFile || (!removingLogo && Boolean(cur?.logo_path))

    const brandName = (d.customName ?? '').trim()
    update.custom_name = brandName || null

    // Nome da marca: máximo 10 caracteres (aparece ao lado da logo na sidebar).
    if (brandName.length > 10) {
      return { ok: false, fieldErrors: { customName: 'O nome da marca deve ter no máximo 10 caracteres.' } }
    }

    // Marca personalizada exige logo E nome JUNTOS — não salva só um dos dois.
    const hasName = brandName.length > 0
    if (hasName !== willHaveLogo) {
      const fieldErrors: Record<string, string> = {}
      if (!hasName) fieldErrors.customName = 'Informe o nome da marca (a logo precisa de um nome).'
      if (!willHaveLogo) fieldErrors.logo = 'Envie a logo da marca (o nome precisa de uma logo).'
      return {
        ok: false,
        fieldErrors,
        error: 'Para a marca personalizada, informe a logo e o nome juntos (ou deixe os dois em branco).',
      }
    }

    if (hasNewFile && file instanceof File) {
      const up = await uploadSchoolLogo(file, me.schoolId)
      if (!up.ok) return { ok: false, fieldErrors: { logo: up.error } }
      if (cur?.logo_path) await deleteSchoolLogo(cur.logo_path)
      update.logo_path = up.url
    } else if (removingLogo && cur?.logo_path) {
      await deleteSchoolLogo(cur.logo_path)
      update.logo_path = null
    }
  }

  const { error } = await supabase.from('schools').update(update).eq('id', me.schoolId)
  if (error) return { ok: false, error: 'Não foi possível salvar as configurações.' }

  revalidatePath('/admin/settings')
  revalidatePath('/cobrancas')
  revalidatePath('/', 'layout')
  return { ok: true }
}
