'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getPlanContext } from '@/lib/auth/plan'
import { notify } from '@/lib/notifications/notify'

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

  // Pagamento confirmado → notifica o aluno (e/ou responsável).
  if (status === 'paid') {
    const { data: charge } = await supabase
      .from('charges')
      .select('amount, enrollment:enrollments(student_id)')
      .eq('id', chargeId)
      .maybeSingle()
    const enr = charge?.enrollment as { student_id: string } | null
    if (charge && enr) {
      await notify('charge.paid', enr.student_id, {
        amount: Number(charge.amount),
        paymentMethod,
      }, { relatedId: chargeId })
    }
  }

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

  // Insert RETURNING — só as recém-criadas viram notificação (upsert ignoreDuplicates
  // não retorna as duplicadas, então só pegamos as novas mesmo).
  const { data: inserted } = await supabase
    .from('charges')
    .upsert(charges, { onConflict: 'enrollment_id,due_date', ignoreDuplicates: true })
    .select('id, amount, due_date, enrollment:enrollments(student_id, plan:plans(name))')

  // Notifica cada cobrança nova (charge.created). Em paralelo p/ não bloquear.
  if (inserted?.length) {
    await Promise.all(inserted.map((c) => {
      const enr = c.enrollment as { student_id: string; plan: { name: string } | null } | null
      if (!enr) return Promise.resolve()
      return notify('charge.created', enr.student_id, {
        amount: Number(c.amount),
        dueDate: new Date(c.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
        planName: enr.plan?.name ?? null,
      }, { relatedId: c.id })
    }))
  }

  revalidatePath('/financial')
}
