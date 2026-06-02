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
  type SchoolUpdate = {
    custom_name: string | null
    brand_primary?: string | null
    brand_secondary?: string | null
    logo_path?: string | null
  }
  const update: SchoolUpdate = { custom_name: d.customName || null }

  const { features } = await getPlanContext()
  if (features.branding) {
    update.brand_primary = d.brandPrimary || null
    update.brand_secondary = d.brandSecondary || null

    const { data: cur } = await supabase.from('schools').select('logo_path').eq('id', me.schoolId).maybeSingle()
    const file = formData.get('logo')
    if (file instanceof File && file.size > 0) {
      const up = await uploadSchoolLogo(file, me.schoolId)
      if (!up.ok) return { ok: false, fieldErrors: { logo: up.error } }
      if (cur?.logo_path) await deleteSchoolLogo(cur.logo_path)
      update.logo_path = up.url
    } else if (formData.get('removeLogo') === 'on' && cur?.logo_path) {
      await deleteSchoolLogo(cur.logo_path)
      update.logo_path = null
    }
  }

  const { error } = await supabase.from('schools').update(update).eq('id', me.schoolId)
  if (error) return { ok: false, error: 'Não foi possível salvar as configurações.' }

  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}
