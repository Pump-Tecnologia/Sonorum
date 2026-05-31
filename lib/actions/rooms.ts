'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export type RoomActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

const roomSchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(120),
})

async function requireAdmin(): Promise<{ id: string; schoolId: string } | null> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return null
  return { id: me.id, schoolId: me.schoolId }
}

export async function createRoom(_prev: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const me = await requireAdmin()
  if (!me) return { ok: false, error: 'Acesso negado.' }

  const parsed = roomSchema.safeParse({
    name: formData.get('name'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido'])) }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('rooms').insert({
    school_id: me.schoolId,
    name: parsed.data.name,
  })
  if (error) return { ok: false, error: 'Não foi possível criar a sala.' }

  revalidatePath('/admin/settings')
  return { ok: true }
}

export async function deleteRoom(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const roomId = String(formData.get('roomId') ?? '')
  if (!roomId) return

  const supabase = await createClient()
  // ON DELETE SET NULL nas aulas — apagar a sala não apaga aulas.
  await supabase.from('rooms').delete().eq('id', roomId).eq('school_id', me.schoolId)
  revalidatePath('/admin/settings')
}
