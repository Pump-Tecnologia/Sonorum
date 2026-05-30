import type { SchoolPlanType } from '@/lib/types/app'

// Fonte única da verdade dos limites/funções por plano.
// Espelha o check_school_plan do código Laravel antigo.
export interface PlanFeatures {
  label: string
  studentLimit: number // Infinity = ilimitado
  teacherLimit: number
  financial: boolean // planos, matrículas, cobranças
  reports: boolean // módulo de relatórios
}

export const PLAN_FEATURES: Record<SchoolPlanType, PlanFeatures> = {
  free: {
    label: 'Essencial',
    studentLimit: 5,
    teacherLimit: 1, // o admin já pode lecionar; ajuste aqui se quiser outro teto
    financial: false,
    reports: false,
  },
  basic: {
    label: 'Básico',
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: false,
  },
  professional: {
    label: 'Profissional',
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: true,
  },
  premium: {
    label: 'Premium',
    studentLimit: Infinity,
    teacherLimit: Infinity,
    financial: true,
    reports: true,
  },
}

export function planFeatures(planType: string | null | undefined): PlanFeatures {
  return PLAN_FEATURES[(planType as SchoolPlanType) ?? 'free'] ?? PLAN_FEATURES.free
}

export type PlanFeatureKey = 'financial' | 'reports'
