import { redirect } from 'next/navigation'
import { cache } from 'react'

import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import { UpcomingLessonReminder } from '@/components/app/UpcomingLessonReminder'
import styles from '@/components/app/app.module.css'
import { FinanceVisibilityProvider } from '@/components/ui/FinanceVisibility'
import { getImpersonatorId } from '@/lib/actions/impersonate'
import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures } from '@/lib/constants/plans'
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
    .select('custom_name, name, brand_primary, logo_path, plan_type')
    .eq('id', schoolId)
    .single()
  if (!data) return null
  const branded = planFeatures(data.plan_type).branding
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
    // Destaque do item ativo da sidebar (sidebar continua navy fixa).
    '--ds-accent': accent,
    '--ds-accent-deep': mix(82, 'black'),
  }
}

// Guarda da área autenticada. O middleware já bloqueia não-logados e roteia por
// papel; aqui garantimos o perfil e montamos o shell com a sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, impersonatorId] = await Promise.all([getCurrentUser(), getImpersonatorId()])
  if (!user) redirect('/login')

  const branding = await getSchoolBranding(user.schoolId)

  // Marca = ACENTO + sidebar neutra. Sem personalização, a sidebar é o navy
  // Sonorum. Ao personalizar, a sidebar vira um branco acizentado (neutro, não
  // brifica o navy do Sonorum com a cor da escola) + texto escuro; a cor da
  // marca aparece só como acento (brand-*, item ativo).
  const shellStyle: Record<string, string> = branding?.accent
    ? {
        ...accentVars(branding.accent),
        '--ds-panel-bg': '#D3D8E0', // cinza claro neutro (não whitelabel)
        '--ds-on-panel': '#28323F', // texto escuro sobre painel claro
      }
    : {}

  const isImpersonating = Boolean(impersonatorId) && impersonatorId !== user.id

  return (
    <FinanceVisibilityProvider>
      <div className={styles.shell} style={shellStyle as React.CSSProperties}>
        {isImpersonating && <ImpersonationBanner asUserName={user.name} />}
        <div className={styles.shellMain}>
          <Sidebar
            role={user.role}
            name={user.name}
            // Nome da escola sob a logo só no Premium (marca personalizada).
            // Essencial/Profissional exibem apenas a marca Sonorum.
            schoolName={branding?.branded ? branding.name : null}
            logoUrl={branding?.logoUrl ?? null}
            brandWord={branding?.branded ? (branding.name ?? 'Sonorum') : 'Sonorum'}
          />
          <main className={styles.main}>{children}</main>
        </div>
        {user.role === 'teacher' && <UpcomingLessonReminder />}
      </div>
    </FinanceVisibilityProvider>
  )
}
