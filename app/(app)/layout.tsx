import { redirect } from 'next/navigation'
import { cache } from 'react'

import { GracePeriodBanner } from '@/components/billing/GracePeriodBanner'
import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import { UpcomingLessonReminder } from '@/components/app/UpcomingLessonReminder'
import styles from '@/components/app/app.module.css'
import { FinanceVisibilityProvider } from '@/components/ui/FinanceVisibility'
import { getImpersonatorId } from '@/lib/actions/impersonate'
import { SCHOOL_BRAND_COLOR_ENABLED } from '@/lib/constants/branding'
import { getCurrentUser } from '@/lib/auth/session'
import { effectivePlanFeatures, getPlanContext, isSoloExperience } from '@/lib/auth/plan'
import { createClient } from '@/lib/supabase/server'

interface Branding {
  name: string | null
  accent: string | null
  logoUrl: string | null
  branded: boolean
}

// Marca da escola por request (nome + cor de acento + logo). Cor/logo só valem
// se o plano tem branding (Premium); abaixo disso, cai no visual padrão Sonorum.
const getSchoolBranding = cache(async (schoolId: string | null): Promise<Branding | null> => {
  if (!schoolId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('custom_name, name, brand_primary, logo_path, plan_type, feature_overrides, expiration_date')
    .eq('id', schoolId)
    .single()
  if (!data) return null
  const branded = effectivePlanFeatures(data.plan_type, data.expiration_date, data.feature_overrides).branding
  return {
    name: data.custom_name || data.name || null,
    accent: branded ? data.brand_primary : null,
    logoUrl: branded ? data.logo_path : null,
    branded,
  }
})

// Re-tinta o brand-* a partir de UMA cor de acento (modelo white-label de
// mercado: a interface fica neutra, a marca aparece só como acento). As
// variações claras/escuras saem por color-mix (contraste previsível).
function accentVars(accent: string): Record<string, string> {
  const mix = (pct: number, base: 'white' | 'black') => `color-mix(in srgb, ${accent} ${pct}%, ${base})`
  return {
    '--color-brand-50': mix(8, 'white'),
    '--color-brand-100': mix(16, 'white'),
    '--color-brand-200': mix(34, 'white'),
    '--color-brand-300': mix(52, 'white'),
    '--color-brand-400': mix(68, 'white'),
    '--color-brand-500': mix(85, 'white'),
    '--color-brand-600': accent,
    '--color-brand-700': mix(82, 'black'),
    '--color-brand-800': mix(68, 'black'),
    '--color-brand-900': mix(55, 'black'),
    '--ds-accent': accent,
    '--ds-accent-deep': mix(82, 'black'),
  }
}

// Guarda da área autenticada. O middleware já bloqueia não-logados e roteia por
// papel; aqui garantimos o perfil e montamos o shell com a sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, impersonatorId, plan] = await Promise.all([
    getCurrentUser(),
    getImpersonatorId(),
    getPlanContext(),
  ])
  if (!user) redirect('/login')

  const branding = await getSchoolBranding(user.schoolId)
  // Conta presa a 1 professor (Essencial, Solo, Solo Pro): a nav de "Professores"
  // (gestão de equipe) não se aplica — ver isSingleTeacherAccount.
  const soloAccount = isSoloExperience(plan)

  // Marca = ACENTO sobre a lateral de vidro (igual para todas as escolas). A cor
  // da escola Premium aparece só no item ativo e nos tons brand-* — desligada
  // por enquanto (SCHOOL_BRAND_COLOR_ENABLED, em backlog).
  const shellStyle: Record<string, string> = SCHOOL_BRAND_COLOR_ENABLED && branding?.accent
    ? { ...accentVars(branding.accent), '--sn-nav-active': branding.accent }
    : {}

  const isImpersonating = Boolean(impersonatorId) && impersonatorId !== user.id

  return (
    <FinanceVisibilityProvider>
      <div className={styles.shell} style={shellStyle as React.CSSProperties}>
        {isImpersonating && <ImpersonationBanner asUserName={user.name} asRole={user.role} />}
        {user.role === 'admin' && (
          <GracePeriodBanner
            inGracePeriod={plan.inGracePeriod}
            graceDaysRemaining={plan.graceDaysRemaining}
            isExpired={plan.isExpired}
            expirationDate={plan.expirationDate}
          />
        )}
        <div className={styles.shellMain}>
          <Sidebar
            role={user.role}
            name={user.name}
            // Nome da escola sob a logo só no Premium (marca personalizada).
            // Essencial/Profissional exibem apenas a marca Sonorum.
            schoolName={branding?.branded ? branding.name : null}
            logoUrl={branding?.logoUrl ?? null}
            brandWord={branding?.branded ? (branding.name ?? 'Sonorum') : 'Sonorum'}
            soloAccount={soloAccount}
          />
          <main className={styles.main}>{children}</main>
        </div>
        {user.isTeacher && <UpcomingLessonReminder />}
      </div>
    </FinanceVisibilityProvider>
  )
}
