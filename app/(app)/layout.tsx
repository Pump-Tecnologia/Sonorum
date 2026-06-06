import { redirect } from 'next/navigation'
import { cache } from 'react'

import { ImpersonationBanner } from '@/components/app/ImpersonationBanner'
import { Sidebar } from '@/components/app/Sidebar'
import styles from '@/components/app/app.module.css'
import { FinanceVisibilityProvider } from '@/components/ui/FinanceVisibility'
import { getImpersonatorId } from '@/lib/actions/impersonate'
import { getCurrentUser } from '@/lib/auth/session'
import { planFeatures } from '@/lib/constants/plans'
import { createClient } from '@/lib/supabase/server'

interface Branding {
  name: string | null
  primary: string | null
  secondary: string | null
  logoUrl: string | null
  branded: boolean
}

// Luminância relativa (sRGB) → decide se o fundo é claro (texto escuro) ou
// escuro (texto branco). Aceita #rgb/#rrggbb.
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (full.length !== 6) return false
  const channel = (i: number) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return lum > 0.5
}

// Marca da escola por request (nome + cores + logo). Cores/logo só valem se o
// plano tem branding (Premium); abaixo disso, cai no visual padrão Sonorum.
const getSchoolBranding = cache(async (schoolId: string | null): Promise<Branding | null> => {
  if (!schoolId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('custom_name, name, brand_primary, brand_secondary, logo_path, plan_type')
    .eq('id', schoolId)
    .single()
  if (!data) return null
  const branded = planFeatures(data.plan_type).branding
  return {
    name: data.custom_name || data.name || null,
    primary: branded ? data.brand_primary : null,
    secondary: branded ? data.brand_secondary : null,
    logoUrl: branded ? data.logo_path : null,
    branded,
  }
})

// Guarda da área autenticada. O middleware já bloqueia não-logados e roteia por
// papel; aqui garantimos o perfil e montamos o shell com a sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, impersonatorId] = await Promise.all([getCurrentUser(), getImpersonatorId()])
  if (!user) redirect('/login')

  const branding = await getSchoolBranding(user.schoolId)

  // Cores da marca → CSS vars do shell (a sidebar usa --ds-panel-bg / --ds-green).
  const shellStyle: Record<string, string> = {}
  if (branding?.primary) {
    shellStyle['--ds-panel-bg'] = branding.primary
    // Texto da sidebar adapta ao contraste: marca clara → texto escuro.
    shellStyle['--ds-on-panel'] = isLightColor(branding.primary) ? '#15243A' : '#ffffff'
  }
  if (branding?.secondary) {
    shellStyle['--ds-green'] = branding.secondary
    shellStyle['--ds-green-deep'] = branding.secondary
  }

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
      </div>
    </FinanceVisibilityProvider>
  )
}
