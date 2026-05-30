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
}

// Carrega o plano da escola corrente + contagem de alunos. Memoizado por request.
export const getPlanContext = cache(async (): Promise<PlanContext> => {
  const user = await getCurrentUser()
  if (!user?.schoolId) {
    return { schoolId: null, planType: 'free', features: planFeatures('free'), studentCount: 0 }
  }

  const supabase = await createClient()
  const [{ data: school }, { count }] = await Promise.all([
    supabase.from('schools').select('plan_type').eq('id', user.schoolId).single(),
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
  }
})

// Para Server Components de áreas pagas: redireciona para /upgrade se bloqueado.
export async function requireFeature(key: PlanFeatureKey): Promise<void> {
  const { features } = await getPlanContext()
  if (!features[key]) redirect('/upgrade')
}
