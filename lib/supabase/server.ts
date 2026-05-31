import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/types/database'

// Cliente Supabase para Server Components, Server Actions e Route Handlers.
// Usa o cookie store da request (httpOnly) via @supabase/ssr.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Em Server Components o set lança — é esperado e seguro ignorar,
          // pois o middleware já cuida do refresh do cookie de sessão.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // chamado de um Server Component sem resposta mutável — ok
          }
        },
      },
    },
  )
}

// Cliente com SERVICE ROLE — ignora RLS. Use SOMENTE no servidor, nunca exponha
// a chave ao cliente. Necessário para impersonação, criação de usuários, etc.
//
// IMPORTANTE: usa o createClient puro do supabase-js, SEM cookies. Se passássemos
// o cookie store (via @supabase/ssr), a sessão do admin logado sobrescreveria o
// Authorization com o JWT do usuário (role authenticated) e a Admin API do GoTrue
// (auth.admin.createUser/deleteUser) recusaria — service role precisa ser o token.
export async function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
