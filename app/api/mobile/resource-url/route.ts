import { NextResponse } from 'next/server'

import { signedResourceUrl } from '@/lib/storage/resources'
import { createAdminClient } from '@/lib/supabase/server'

// Link assinado do arquivo de um material, para o app mobile. O bucket é privado e o
// app não tem como assinar sozinho. Autentica pelo JWT do Supabase (Authorization: Bearer)
// e só entrega o arquivo se o material foi usado numa aula do próprio aluno, com as mesmas
// regras da página /student/materials (aula já realizada, não cancelada).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LINK_TTL_SECONDS = 600

const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 })

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const resourceId = new URL(request.url).searchParams.get('resourceId') ?? ''
  if (!UUID.test(resourceId)) return NextResponse.json({ error: 'invalid_resource' }, { status: 400 })

  const admin = await createAdminClient()
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await admin
    .from('pedagogical_resources')
    .select(
      `file_path,
       lesson_pedagogical_resource!inner(lessons!inner(student_id, start_datetime, status))`,
    )
    .eq('id', resourceId)
    .eq('lesson_pedagogical_resource.lessons.student_id', auth.user.id)
    .lte('lesson_pedagogical_resource.lessons.start_datetime', new Date().toISOString())
    .neq('lesson_pedagogical_resource.lessons.status', 'canceled')
    .limit(1)
    .maybeSingle()

  const filePath = (data as { file_path: string | null } | null)?.file_path
  if (!filePath) return notFound()

  const url = await signedResourceUrl(filePath, LINK_TTL_SECONDS)
  if (!url) return notFound()

  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'private, no-store' } })
}
