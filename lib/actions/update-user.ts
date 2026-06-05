'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

// ── Schema compartilhado ─────────────────────────────────────────────────────
const baseSchema = {
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  newPassword: z.string().min(8).optional().or(z.literal('')),
}

const updateStudentSchema = z.object({
  ...baseSchema,
  phone: z.string().max(20).optional(),
  parentContact: z.string().max(255).optional(),
  instrumentCategory: z.string().max(255).optional(),
  instrument: z.string().optional(),
  status: z.enum(['active', 'paused', 'inactive']).default('active'),
  notifyTo: z.enum(['student', 'parent', 'both']).default('both'),
  notifyEmail: z.boolean().default(false),
  permanentNotes: z.string().optional(),
})

const updateTeacherSchema = z.object({
  ...baseSchema,
  instruments: z.string().optional(),
})

export type UpdateActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const flat = error.flatten().fieldErrors
  return Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? 'Inválido']))
}

// Atualiza e-mail e/ou senha no Supabase Auth (service-role).
async function updateAuthUser(userId: string, email: string, password: string | undefined) {
  const admin = await createAdminClient()
  const updates: { email?: string; password?: string } = {}
  updates.email = email
  if (password) updates.password = password

  const { error } = await admin.auth.admin.updateUserById(userId, updates)
  return error
}

// ── Atualizar aluno ──────────────────────────────────────────────────────────
export async function updateStudent(
  _prev: UpdateActionState,
  formData: FormData,
): Promise<UpdateActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const studentId = String(formData.get('studentId') ?? '')

  const parsed = updateStudentSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    newPassword: formData.get('newPassword') || '',
    phone: formData.get('phone') || undefined,
    parentContact: formData.get('parentContact') || undefined,
    instrumentCategory: formData.get('instrumentCategory') || undefined,
    instrument: formData.get('instrument') || undefined,
    status: formData.get('status') || 'active',
    notifyTo: formData.get('notifyTo') || 'both',
    notifyEmail: formData.get('notifyEmail') === 'on',
    permanentNotes: formData.get('permanentNotes') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const d = parsed.data
  const instrumentList = (d.instrument ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  // Verifica que o aluno pertence à escola.
  const supabase = await createClient()
  const { data: target } = await supabase
    .from('users')
    .select('id, role, school_id')
    .eq('id', studentId)
    .single()
  if (!target || target.role !== 'student' || target.school_id !== me.schoolId)
    return { ok: false, error: 'Aluno não encontrado.' }

  const authError = await updateAuthUser(studentId, d.email, d.newPassword || undefined)
  if (authError) {
    const dup = /already registered|exists/i.test(authError.message)
    return {
      ok: false,
      fieldErrors: dup ? { email: 'Este e-mail já está em uso.' } : undefined,
      error: dup ? undefined : 'Erro ao atualizar o acesso do aluno.',
    }
  }

  const admin = await createAdminClient()
  await admin.from('users').update({
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    parent_contact: d.parentContact ?? null,
    instrument_category: d.instrumentCategory ?? null,
    instrument: instrumentList.length ? instrumentList : null,
    status: d.status,
    notify_to: d.notifyTo,
    notify_email: d.notifyEmail,
    permanent_notes: d.permanentNotes ?? null,
  }).eq('id', studentId)

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/students')
  redirect(`/admin/students/${studentId}`)
}

// ── Atualizar professor ──────────────────────────────────────────────────────
export async function updateTeacher(
  _prev: UpdateActionState,
  formData: FormData,
): Promise<UpdateActionState> {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return { ok: false, error: 'Acesso negado.' }

  const teacherId = String(formData.get('teacherId') ?? '')

  const parsed = updateTeacherSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    newPassword: formData.get('newPassword') || '',
    instruments: formData.get('instruments') || undefined,
  })
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }

  const d = parsed.data
  const admin = await createAdminClient()

  const { data: teacher } = await admin
    .from('teachers')
    .select('id, user_id, school_id')
    .eq('id', teacherId)
    .single()
  if (!teacher || teacher.school_id !== me.schoolId)
    return { ok: false, error: 'Professor não encontrado.' }

  const authError = await updateAuthUser(teacher.user_id, d.email, d.newPassword || undefined)
  if (authError) {
    const dup = /already registered|exists/i.test(authError.message)
    return {
      ok: false,
      fieldErrors: dup ? { email: 'Este e-mail já está em uso.' } : undefined,
      error: dup ? undefined : 'Erro ao atualizar o acesso do professor.',
    }
  }

  const instrumentList = (d.instruments ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  await Promise.all([
    admin.from('users').update({ name: d.name, email: d.email }).eq('id', teacher.user_id),
    admin.from('teachers').update({ instruments: instrumentList.length ? instrumentList : null }).eq('id', teacherId),
  ])

  revalidatePath('/admin/teachers')
  redirect('/admin/teachers')
}
