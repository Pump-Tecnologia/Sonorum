import { cache } from 'react'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { isSingleTeacherAccount, planFeatures, type PlanFeatureKey, type PlanFeatures } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/server'
import { addDaysToBRDate, dateInBR, diffInBRDays } from '@/lib/timezone'

export interface PlanContext {
  schoolId: string | null
  planType: string
  features: PlanFeatures
  studentCount: number
  expirationDate: string | null
  inGracePeriod: boolean
  graceDaysRemaining: number
  isExpired: boolean
}

// Prazo de carência (5 dias) concedido após o vencimento da assinatura antes de
// bloquear os serviços e rebaixar a escola para os limites do plano gratuito.
export const GRACE_PERIOD_DAYS = 5

// Indica se uma assinatura está dentro da janela de carência de 5 dias após o vencimento.
export function isPlanInGracePeriod(
  expirationDate: string | null | undefined,
  today = dateInBR(),
): boolean {
  if (!expirationDate) return false
  if (today <= expirationDate) return false
  const cutoff = addDaysToBRDate(expirationDate, GRACE_PERIOD_DAYS)
  return today <= cutoff
}

// Dias restantes de carência (1 a 5). Retorna 0 se não estiver em carência.
export function graceDaysRemaining(
  expirationDate: string | null | undefined,
  today = dateInBR(),
): number {
  if (!expirationDate || !isPlanInGracePeriod(expirationDate, today)) return 0
  const cutoff = addDaysToBRDate(expirationDate, GRACE_PERIOD_DAYS)
  return Math.max(0, diffInBRDays(today, cutoff) + 1)
}

// Indica se o período de carência encerrou definitivamente (hoje > data de vencimento + 5 dias).
export function isPlanGraceExpired(
  expirationDate: string | null | undefined,
  today = dateInBR(),
): boolean {
  if (!expirationDate) return false
  const cutoff = addDaysToBRDate(expirationDate, GRACE_PERIOD_DAYS)
  return today > cutoff
}

// Ao vencer uma assinatura paga, concedemos 5 dias de carência com os recursos
// mantidos. Apenas após expirar a carência rebaixamos a escola para o plano
// gratuito equivalente (free ou solo_free).
export function effectivePlanFeatures(
  planType: string | null | undefined,
  expirationDate: string | null | undefined,
  overrides?: unknown,
  today = dateInBR(),
): PlanFeatures {
  if (!expirationDate || expirationDate >= today || isPlanInGracePeriod(expirationDate, today)) {
    return planFeatures(planType, overrides)
  }
  const soloPlans = new Set(['solo', 'solo_pro', 'solo_free'])
  return planFeatures(soloPlans.has(planType ?? '') ? 'solo_free' : 'free')
}

// Carrega o plano da escola corrente + contagem de alunos. Memoizado por request.
export const getPlanContext = cache(async (): Promise<PlanContext> => {
  const user = await getCurrentUser()
  if (!user?.schoolId) {
    return {
      schoolId: null,
      planType: 'free',
      features: planFeatures('free'),
      studentCount: 0,
      expirationDate: null,
      inGracePeriod: false,
      graceDaysRemaining: 0,
      isExpired: false,
    }
  }

  const supabase = await createClient()
  const [{ data: school }, { count }] = await Promise.all([
    supabase.from('schools').select('plan_type, expiration_date, feature_overrides').eq('id', user.schoolId).single(),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', user.schoolId)
      .eq('role', 'student'),
  ])

  const planType = (school?.plan_type as string) ?? 'free'
  const expirationDate = (school?.expiration_date as string) ?? null
  const today = dateInBR()
  const inGrace = isPlanInGracePeriod(expirationDate, today)
  const remaining = graceDaysRemaining(expirationDate, today)
  const expired = Boolean(expirationDate && expirationDate < today)

  return {
    schoolId: user.schoolId,
    planType,
    features: effectivePlanFeatures(planType, expirationDate, school?.feature_overrides, today),
    studentCount: count ?? 0,
    expirationDate,
    inGracePeriod: inGrace,
    graceDaysRemaining: remaining,
    isExpired: expired,
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
  const today = dateInBR()
  return ctx.expirationDate < today
}

// Planos de equipe vencidos ainda precisam acessar a lista para reduzir a
// equipe ao limite gratuito. Contas Solo continuam usando o próprio perfil.
export function isSoloExperience(ctx: PlanContext): boolean {
  const soloPlan = ['free', 'solo_free', 'solo', 'solo_pro'].includes(ctx.planType)
  return isSingleTeacherAccount(ctx.features) && (soloPlan || !isPlanExpired(ctx))
}

export type TranscriptionAccess = 'ok' | 'not_premium' | 'expired'

// Acesso à transcrição por IA: exige a feature do plano (Premium) E não ter a
// carência expirada. Diferente de requireFeature pq não redireciona — a UI mostra upsell inline.
export async function transcriptionAccess(): Promise<TranscriptionAccess> {
  const ctx = await getPlanContext()
  if (ctx.isExpired && !ctx.inGracePeriod) return 'expired'
  if (!ctx.features.transcription) return 'not_premium'
  return 'ok'
}
