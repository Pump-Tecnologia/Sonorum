'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

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
  const { error } = await supabase
    .from('schools')
    .update({
      custom_name: d.customName || null,
      brand_primary: d.brandPrimary || null,
      brand_secondary: d.brandSecondary || null,
    })
    .eq('id', me.schoolId)

  if (error) return { ok: false, error: 'Não foi possível salvar as configurações.' }

  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}
