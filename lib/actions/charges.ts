'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'

export async function updateChargeStatus(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return
  const { features } = await getPlanContext()
  if (!features.financial) return

  const chargeId = String(formData.get('chargeId') ?? '')
  const status = String(formData.get('status') ?? '')
  const paymentMethod = String(formData.get('paymentMethod') ?? '') || null

  type ChargeUpdate = { status: string; paid_at?: string | null; payment_method?: string | null }
  const update: ChargeUpdate = { status }
  if (status === 'paid') {
    update.paid_at = new Date().toISOString()
    update.payment_method = paymentMethod
  } else if (status === 'pending') {
    update.paid_at = null
    update.payment_method = null
  }

  const supabase = await createClient()
  await supabase.from('charges').update(update).eq('id', chargeId).eq('school_id', me.schoolId)
  revalidatePath('/financial')
}

// Gera cobranças mensais para todas as matrículas ativas da escola
export async function generateMonthlyCharges(formData: FormData) {
  const me = await getCurrentUser()
  if (me?.role !== 'admin' || !me.schoolId) return
  const { features } = await getPlanContext()
  if (!features.financial) return

  const monthStr = String(formData.get('month') ?? '') // YYYY-MM
  if (!monthStr) return

  const [year, month] = monthStr.split('-').map(Number)
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, due_day, custom_amount, plan:plans(amount)')
    .eq('school_id', me.schoolId)
    .eq('status', 'active')

  if (!enrollments?.length) return

  const charges = enrollments.map((e) => {
    const plan = e.plan as { amount: number } | null
    const dueDate = new Date(year, month - 1, e.due_day)
    return {
      school_id: me.schoolId,
      enrollment_id: e.id,
      amount: e.custom_amount ?? plan?.amount ?? 0,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'pending',
    }
  })

  await supabase.from('charges').upsert(charges, { onConflict: 'enrollment_id,due_date', ignoreDuplicates: true })
  revalidatePath('/financial')
}
