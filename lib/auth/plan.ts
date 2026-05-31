import { cache } from 'react'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures, type PlanFeatureKey, type PlanFeatures } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/server'

export interface PlanContext {
  schoolId: string | null
  planType: string
  features: PlanFeatures
  studentCount: number
  expirationDate: string | null
}

// Carrega o plano da escola corrente + contagem de alunos. Memoizado por request.
export const getPlanContext = cache(async (): Promise<PlanContext> => {
  const user = await getCurrentUser()
  if (!user?.schoolId) {
    return { schoolId: null, planType: 'free', features: planFeatures('free'), studentCount: 0, expirationDate: null }
  }

  const supabase = await createClient()
  const [{ data: school }, { count }] = await Promise.all([
    supabase.from('schools').select('plan_type, expiration_date').eq('id', user.schoolId).single(),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', user.schoolId)
      .eq('role', 'student'),
  ])

  const planType = (school?.plan_type as string) ?? 'free'
  return {
    schoolId: user.schoolId,
    planType,
    features: planFeatures(planType),
    studentCount: count ?? 0,
    expirationDate: (school?.expiration_date as string) ?? null,
  }
})

// Para Server Components de áreas pagas: redireciona para /upgrade se bloqueado.
export async function requireFeature(key: PlanFeatureKey): Promise<void> {
  const { features } = await getPlanContext()
  if (!features[key]) redirect('/upgrade')
}

// Vencimento do plano. Sem data = sem vencimento (não expira).
export function isPlanExpired(ctx: PlanContext): boolean {
  if (!ctx.expirationDate) return false
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  return ctx.expirationDate < today
}

export type TranscriptionAccess = 'ok' | 'not_premium' | 'expired'

// Acesso à transcrição por IA: exige a feature do plano (Premium) E não vencido.
// Diferente de requireFeature pq não redireciona — a UI mostra upsell inline.
export async function transcriptionAccess(): Promise<TranscriptionAccess> {
  const ctx = await getPlanContext()
  if (!ctx.features.transcription) return 'not_premium'
  if (isPlanExpired(ctx)) return 'expired'
  return 'ok'
}
