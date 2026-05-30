'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { homeForRole } from '@/lib/constants/roles'

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

  // Autorização
  if (me.role === 'superadmin') {
    // pode tudo
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

  // Guarda o ID do impersonador para depois voltar
  const jar = await cookies()
  jar.set(IMPERSONATOR_COOKIE, me.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  })

  // Desloga sessão atual e abre a do alvo usando o token do magic link
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyError) return

  redirect(homeForRole(target.role))
}

// Volta para o usuário original
export async function stopImpersonating() {
  const jar = await cookies()
  const impersonatorId = jar.get(IMPERSONATOR_COOKIE)?.value
  if (!impersonatorId) return

  const admin = await createAdminClient()
  const { data: original } = await admin
    .from('users')
    .select('id, email, role')
    .eq('id', impersonatorId)
    .single()

  if (!original?.email) return

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: original.email,
  })
  if (!linkData?.properties?.hashed_token) return

  const supabase = await createClient()
  await supabase.auth.signOut()
  await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })

  jar.delete(IMPERSONATOR_COOKIE)
  redirect(homeForRole(original.role))
}

// Lê o cookie para mostrar o banner
export async function getImpersonatorId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(IMPERSONATOR_COOKIE)?.value ?? null
}
