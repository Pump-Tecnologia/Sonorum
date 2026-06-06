'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/server'

// Desconecta o Google Calendar do usuário (marca como revogado).
export async function disconnectGoogleCalendar() {
  const me = await getCurrentUser()
  if (!me) return
  const admin = await createAdminClient()
  await admin
    .from('google_calendar_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', me.id)
    .eq('provider', 'google')
  revalidatePath('/profile')
}
