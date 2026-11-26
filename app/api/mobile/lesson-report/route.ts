import { NextResponse } from 'next/server'

import { effectivePlanFeatures } from '@/lib/auth/plan'
import { deliverLessonReport } from '@/lib/reports/lesson-report'
import { rateLimit } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

// Envio do relatório da aula pelo app mobile. Autentica pelo JWT do Supabase
// (Authorization: Bearer) e aplica as mesmas regras do site: só equipe da escola,
// só em planos com Relatórios. O professor envia apenas as próprias aulas.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMIT = 10
const WINDOW_MS = 5 * 60 * 1000

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return fail('unauthorized', 401)

  const body = (await request.json().catch(() => null)) as { lessonId?: unknown } | null
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId : ''
  if (!UUID.test(lessonId)) return fail('invalid_lesson', 400)

  const admin = await createAdminClient()
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user) return fail('unauthorized', 401)

  const { data: me } = await admin.from('users').select('role, school_id').eq('id', auth.user.id).maybeSingle()
  if (!me?.school_id || !['admin', 'teacher'].includes(me.role ?? '')) return fail('forbidden', 403)

  const { data: lesson } = await admin.from('lessons').select('school_id, teacher_id').eq('id', lessonId).maybeSingle()
  const isOthersLesson = me.role === 'teacher' && lesson?.teacher_id !== auth.user.id
  if (!lesson || lesson.school_id !== me.school_id || isOthersLesson) return fail('not_found', 404)

  const { data: school } = await admin
    .from('schools')
    .select('plan_type, expiration_date, feature_overrides')
    .eq('id', me.school_id)
    .maybeSingle()
  if (!effectivePlanFeatures(school?.plan_type, school?.expiration_date, school?.feature_overrides).reports) {
    return fail('plan', 403)
  }

  const limit = await rateLimit(`lesson-report:${auth.user.id}`, LIMIT, WINDOW_MS)
  if (!limit.ok) return fail('rate_limited', 429)

  const delivery = await deliverLessonReport(lessonId, me.school_id)
  if (!delivery.ok) return NextResponse.json({ error: 'not_sent', message: delivery.error }, { status: 422 })

  const { email, whatsapp } = delivery.result
  return NextResponse.json(
    { email, whatsappSent: whatsapp.sent },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
