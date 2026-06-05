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

export function planFeatures(planType: string | null | undefined): PlanFeatures {
  return PLAN_FEATURES[(planType as SchoolPlanType) ?? 'free'] ?? PLAN_FEATURES.free
}

export type PlanFeatureKey = 'financial' | 'reports' | 'transcription' | 'branding'
