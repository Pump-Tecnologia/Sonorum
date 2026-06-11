import type { SchoolPlanType } from '@/lib/types/app'

// Fonte única da verdade dos limites/funções por plano.
// Espelha o check_school_plan do código Laravel antigo.
export interface PlanFeatures {
  label: string
  price: number // preço de tabela mensal (R$). 0 = não vendido por auto-serviço.
  studentLimit: number // Infinity = ilimitado
  teacherLimit: number
  financial: boolean // planos, matrículas, cobranças
  reports: boolean // módulo de relatórios
  transcription: boolean // transcrição de cifra por IA (exclusivo Premium)
  branding: boolean // logo e cores da marca personalizados (exclusivo Premium)
  whatsappOfficial: boolean // envio automático pelo WhatsApp oficial (exclusivo Premium)
}

export const PLAN_FEATURES: Record<SchoolPlanType, PlanFeatures> = {
  free: {
    label: 'Essencial',
    price: 0,
    studentLimit: 5,
    teacherLimit: 1, // o admin já pode lecionar; ajuste aqui se quiser outro teto
    financial: true, // planos, matrículas e cobranças liberados no Essencial
    reports: false, // relatórios seguem diferencial pago (Profissional+)
    transcription: false,
    branding: false,
    whatsappOfficial: false,
  },
  basic: {
    label: 'Básico',
    price: 0,
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: false,
    transcription: false,
    branding: false,
    whatsappOfficial: false,
  },
  professional: {
    label: 'Profissional',
    price: 99,
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: true,
    transcription: false,
    branding: false,
    whatsappOfficial: false,
  },
  premium: {
    label: 'Premium',
    price: 199,
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: true,
    transcription: true,
    branding: true,
    whatsappOfficial: true,
  },
  // Plano "Sob medida": herda tudo do Premium; preço é negociado por escola
  // (schools.monthly_price). Fora de SELLABLE_PLANS — atribuído só pelo superadmin.
  enterprise: {
    label: 'Sob medida',
    price: 0,
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: true,
    transcription: true,
    branding: true,
    whatsappOfficial: true,
  },
}

// Planos vendáveis por auto-serviço (na ordem exibida).
export const SELLABLE_PLANS: SchoolPlanType[] = ['professional', 'premium']

// Preço efetivo: override negociado da escola (monthly_price>0) tem prioridade
// sobre o preço de tabela do plano.
export function planPrice(planType: string, schoolMonthlyPrice?: number | null): number {
  const custom = Number(schoolMonthlyPrice ?? 0)
  if (custom > 0) return custom
  return PLAN_FEATURES[(planType as SchoolPlanType)]?.price ?? 0
}

// Recursos que o superadmin pode sobrescrever por escola (schools.feature_overrides).
// Usado sobretudo pelo plano enterprise ("Sob medida"), mas vale para qualquer plano.
export const OVERRIDABLE_FEATURES = [
  'financial', 'reports', 'transcription', 'branding', 'whatsappOfficial',
] as const
export type OverridableFeature = (typeof OVERRIDABLE_FEATURES)[number]

// Aplica os overrides da escola (jsonb) sobre os recursos do plano. Só chaves
// conhecidas e booleanas valem; o resto é ignorado (entrada não confiável).
export function applyFeatureOverrides(base: PlanFeatures, overrides: unknown): PlanFeatures {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return base
  const raw = overrides as Record<string, unknown>
  const merged: PlanFeatures = { ...base }
  for (const key of OVERRIDABLE_FEATURES) {
    if (typeof raw[key] === 'boolean') merged[key] = raw[key] as boolean
  }
  return merged
}

// `overrides` é o schools.feature_overrides (jsonb). null/ausente = só o plano.
export function planFeatures(planType: string | null | undefined, overrides?: unknown): PlanFeatures {
  const base = PLAN_FEATURES[(planType as SchoolPlanType) ?? 'free'] ?? PLAN_FEATURES.free
  return overrides == null ? base : applyFeatureOverrides(base, overrides)
}

export type PlanFeatureKey = 'financial' | 'reports' | 'transcription' | 'branding'
