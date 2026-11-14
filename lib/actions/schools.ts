'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { sendCredentialsEmail } from '@/lib/notifications/credentials'
import { getCurrentUser } from '@/lib/auth/session'
import { OVERRIDABLE_FEATURES, planFeatures } from '@/lib/constants/plans'
import { createUserWithProfile, generatePassword } from '@/lib/users/admin'
import { provisionSchoolLibrary } from '@/lib/actions/resource-templates'

// Lê os toggles de recurso do form (ov_<feature> = ''|'on'|'off') e monta o
// objeto de override por escola. Vazio → null (sem override, segue o plano).
function parseFeatureOverrides(formData: FormData): Record<string, boolean> | null {
  const out: Record<string, boolean> = {}
  for (const key of OVERRIDABLE_FEATURES) {
    const v = String(formData.get(`ov_${key}`) ?? '')
    if (v === 'on') out[key] = true
    else if (v === 'off') out[key] = false
  }
  return Object.keys(out).length > 0 ? out : null
}

const createSchoolSchema = z.object({
  name: z.string().min(2, 'Informe o nome da escola').max(255),
  adminEmail: z.string().email('E-mail inválido').max(255),
  planType: z.enum(['free', 'solo_free', 'solo', 'solo_pro', 'professional', 'premium', 'enterprise']),
  monthlyPrice: z.coerce.number().min(0, 'Valor inválido'),
})

export type SchoolActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  createdEmail?: string
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function createSchool(
  _prev: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'superadmin') return { ok: false, error: 'Acesso negado.' }

  const parsed = createSchoolSchema.safeParse({
    name: formData.get('name'),
    adminEmail: formData.get('adminEmail'),
    planType: formData.get('planType'),
    monthlyPrice: formData.get('monthlyPrice'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
      ),
    }
  }

  const { name, adminEmail, planType, monthlyPrice } = parsed.data
  const admin = await createAdminClient()

  // slug único
  const base = slugify(name)
  let slug = base
  for (let i = 1; ; i++) {
    const { data: clash } = await admin.from('schools').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const schoolFeatures = planFeatures(planType)
  const studentLimit = Number.isFinite(schoolFeatures.studentLimit) ? schoolFeatures.studentLimit : 999999

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({
      name,
      slug,
      plan_type: planType,
      active_plan: planType,
      monthly_price: monthlyPrice,
      student_limit: studentLimit,
    })
    .select('id')
    .single()

  if (schoolError || !school) {
    return { ok: false, error: 'Não foi possível criar a escola.' }
  }

  const tempPassword = generatePassword()
  const result = await createUserWithProfile({
    email: adminEmail,
    password: tempPassword,
    name: `Administrador ${name}`,
    role: 'admin',
    schoolId: school.id,
  })

  if (!result.ok) {
    await admin.from('schools').delete().eq('id', school.id)
    return {
      ok: false,
      fieldErrors: result.isDuplicate ? { adminEmail: result.error } : undefined,
      error: result.isDuplicate ? undefined : result.error,
    }
  }

  // Nas contas Solo o próprio admin também ocupa o único vínculo de professor.
  if (['solo_free', 'solo', 'solo_pro'].includes(planType)) {
    const { error: teacherError } = await admin.from('teachers').insert({
      user_id: result.userId,
      school_id: school.id,
      status: 'active',
    })
    if (teacherError) {
      await admin.auth.admin.deleteUser(result.userId)
      await admin.from('schools').delete().eq('id', school.id)
      return { ok: false, error: 'Não foi possível criar o perfil de professor da conta Solo.' }
    }
  }

  const setupEmail = await sendCredentialsEmail({
    admin,
    to: adminEmail,
    name: `Administrador ${name}`,
    schoolName: name,
    kind: 'new',
  })
  if (!setupEmail.ok) {
    await admin.auth.admin.deleteUser(result.userId)
    await admin.from('schools').delete().eq('id', school.id)
    return { ok: false, error: 'Não foi possível enviar o link de definição de senha. A escola não foi criada.' }
  }

  // Escola nasce com a biblioteca de recursos do catálogo (cópias editáveis).
  await provisionSchoolLibrary(school.id)

  revalidatePath('/superadmin')
  return { ok: true, createdEmail: adminEmail }
}

const updateSchoolSchema = z.object({
  schoolId: z.string().uuid(),
  planType: z.enum(['free', 'solo_free', 'solo', 'solo_pro', 'professional', 'premium', 'enterprise']),
  monthlyPrice: z.coerce.number().min(0, 'Valor inválido'),
  expirationDate: z.string().optional().or(z.literal('')),
})

// Edita plano/valor/vencimento de uma escola. Superadmin apenas.
export async function updateSchool(
  _prev: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'superadmin') return { ok: false, error: 'Acesso negado.' }

  const parsed = updateSchoolSchema.safeParse({
    schoolId: formData.get('schoolId'),
    planType: formData.get('planType'),
    monthlyPrice: formData.get('monthlyPrice'),
    expirationDate: formData.get('expirationDate') || '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido']),
      ),
    }
  }

  const { schoolId, planType, monthlyPrice, expirationDate } = parsed.data
  const admin = await createAdminClient()
  const schoolFeatures = planFeatures(planType)
  const studentLimit = Number.isFinite(schoolFeatures.studentLimit) ? schoolFeatures.studentLimit : 999999
  const featureOverrides = parseFeatureOverrides(formData)

  const { error } = await admin
    .from('schools')
    .update({
      plan_type: planType,
      active_plan: planType,
      monthly_price: monthlyPrice,
      expiration_date: expirationDate || null,
      student_limit: studentLimit,
      feature_overrides: featureOverrides,
    })
    .eq('id', schoolId)

  if (error) return { ok: false, error: 'Não foi possível atualizar a escola.' }

  revalidatePath('/superadmin')
  return { ok: true }
}
