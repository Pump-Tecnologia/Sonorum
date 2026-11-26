'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { homeForRole } from '@/lib/constants/roles'
import { signImpersonationState, verifyImpersonationState } from '@/lib/auth/impersonation-cookie'

const IMPERSONATOR_COOKIE = 'sonorum_impersonator'

// Inicia impersonação. Quem pode:
// - superadmin → qualquer admin/teacher/student
// - admin → teacher ou student DA PRÓPRIA escola
export async function impersonate(formData: FormData) {
  const me = await getCurrentUser()
  if (!me) return

  const targetUserId = String(formData.get('targetUserId') ?? '')
  if (!targetUserId || targetUserId === me.id) return

  const admin = await createAdminClient()
  const { data: target } = await admin
    .from('users')
    .select('id, email, role, school_id')
    .eq('id', targetUserId)
    .single()

  if (!target?.email) return

  // Autorização — superadmin NUNCA é alvo (trava de escalonamento horizontal).
  if (target.role === 'superadmin') return
  if (me.role === 'superadmin') {
    // pode impersonar admin/teacher/student
  } else if (me.role === 'admin') {
    if (!['teacher', 'student'].includes(target.role)) return
    if (target.school_id !== me.schoolId) return
  } else {
    return
  }

  // Gera magic link e extrai o token
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
  })
  if (linkError || !linkData?.properties?.hashed_token) return

  // Abre a sessão do alvo por cima da atual, sem deslogar antes. Os cookies novos
  // só chegam ao navegador na resposta: se quem clicou sair da página no meio, a
  // sessão original continua valendo (antes o signOut global já a tinha revogado,
  // em todos os aparelhos, e a pessoa caía no login).
  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyError) return

  const jar = await cookies()
  jar.set(IMPERSONATOR_COOKIE, signImpersonationState({
    actorId: me.id,
    actorRole: me.role as 'admin' | 'superadmin',
    actorSchoolId: me.schoolId,
    targetId: target.id,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })

  // Trilha de auditoria: quem impersonou quem (best-effort, não bloqueia o fluxo).
  await admin.from('impersonation_events').insert({
    action: 'start',
    impersonator_id: me.id,
    impersonator_role: me.role,
    target_id: target.id,
    target_role: target.role,
    school_id: target.school_id,
  })

  redirect(homeForRole(target.role))
}

// Volta para o usuário original
export async function stopImpersonating() {
  const jar = await cookies()
  const state = verifyImpersonationState(jar.get(IMPERSONATOR_COOKIE)?.value)
  if (!state) {
    jar.delete(IMPERSONATOR_COOKIE)
    return
  }

  const current = await getCurrentUser()
  if (!current || current.id !== state.targetId) {
    jar.delete(IMPERSONATOR_COOKIE)
    return
  }

  const admin = await createAdminClient()
  const { data: original } = await admin
    .from('users')
    .select('id, email, role, school_id')
    .eq('id', state.actorId)
    .single()

  const actorStillAuthorized = original &&
    original.role === state.actorRole &&
    ((state.actorRole === 'superadmin' && current.role !== 'superadmin') ||
      (state.actorRole === 'admin' &&
        original.school_id === state.actorSchoolId &&
        current.schoolId === state.actorSchoolId &&
        ['teacher', 'student'].includes(current.role)))
  if (!actorStillAuthorized || !original?.email) {
    jar.delete(IMPERSONATOR_COOKIE)
    return
  }

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: original.email,
  })
  if (!linkData?.properties?.hashed_token) return

  // Guarda a sessão de impersonação para encerrar só ela depois. O signOut global
  // de antes derrubava o usuário real (professor, aluno) em todos os aparelhos.
  const supabase = await createClient()
  const { data: { session: impersonationSession } } = await supabase.auth.getSession()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyError) {
    jar.delete(IMPERSONATOR_COOKIE)
    redirect('/login')
  }
  if (impersonationSession?.access_token) {
    const { error: revokeError } = await admin.auth.admin.signOut(impersonationSession.access_token, 'local')
    if (revokeError) console.error('[impersonate] não encerrou a sessão de impersonação', revokeError.message)
  }

  // Fecha a trilha só depois de confirmar a volta para a conta original.
  await admin.from('impersonation_events').insert({
    action: 'stop',
    impersonator_id: original.id,
    impersonator_role: original.role,
    target_id: current.id,
    target_role: current.role,
    school_id: current.schoolId,
  })

  jar.delete(IMPERSONATOR_COOKIE)
  redirect(homeForRole(original.role))
}

// Lê o cookie para mostrar o banner
export async function getImpersonatorId(): Promise<string | null> {
  const jar = await cookies()
  const state = verifyImpersonationState(jar.get(IMPERSONATOR_COOKIE)?.value)
  return state?.actorId ?? null
}
