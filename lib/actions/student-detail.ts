'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return null
  return me
}

// ── Metas (student_goals) ────────────────────────────────────────────────────
export async function addGoal(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const studentId = String(formData.get('studentId') ?? '')
  const text = String(formData.get('text') ?? '').trim()
  if (!studentId || !text) return

  const supabase = await createClient()
  await supabase
    .from('student_goals')
    .insert({ student_id: studentId, school_id: me.schoolId, text, completed: false })
  revalidatePath(`/admin/students/${studentId}`)
}

export async function toggleGoal(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const goalId = String(formData.get('goalId') ?? '')
  const studentId = String(formData.get('studentId') ?? '')
  const completed = formData.get('completed') === 'true'

  const supabase = await createClient()
  await supabase.from('student_goals').update({ completed: !completed }).eq('id', goalId)
  revalidatePath(`/admin/students/${studentId}`)
}

export async function deleteGoal(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const goalId = String(formData.get('goalId') ?? '')
  const studentId = String(formData.get('studentId') ?? '')

  const supabase = await createClient()
  await supabase.from('student_goals').delete().eq('id', goalId)
  revalidatePath(`/admin/students/${studentId}`)
}

// ── Notas (student_notes) ────────────────────────────────────────────────────
export async function addNote(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const studentId = String(formData.get('studentId') ?? '')
  const content = String(formData.get('content') ?? '').trim()
  if (!studentId || !content) return

  const supabase = await createClient()
  await supabase
    .from('student_notes')
    .insert({ user_id: studentId, school_id: me.schoolId, content })
  revalidatePath(`/admin/students/${studentId}`)
}

export async function deleteNote(formData: FormData) {
  const me = await requireAdmin()
  if (!me) return
  const noteId = String(formData.get('noteId') ?? '')
  const studentId = String(formData.get('studentId') ?? '')

  const supabase = await createClient()
  await supabase.from('student_notes').delete().eq('id', noteId)
  revalidatePath(`/admin/students/${studentId}`)
}
