// Tipos de domínio curados à mão (estáveis, independem da geração do Supabase).
import type { Role } from '@/lib/constants/roles'

export type { Role }

// Claims customizados injetados pelo Custom Access Token Hook (0003_auth_hook.sql).
export interface SonorumClaims {
  sub: string
  email?: string
  user_role: Role
  school_id: string | null
}

export type SchoolPlanType = 'free' | 'basic' | 'professional' | 'premium'
export type UserStatus = 'active' | 'paused' | 'inactive'
export type LessonStatus = 'scheduled' | 'completed' | 'canceled'
export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
