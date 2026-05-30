import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !['admin', 'teacher'].includes(me.role)) return NextResponse.json([], { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const supabase = await createClient()

  let query = supabase
    .from('pedagogical_resources')
    .select('id, title, category, instrument, difficulty')
    .order('title')
    .limit(20)

  if (q) {
    query = query.or(`title.ilike.%${q}%,instrument.ilike.%${q}%`)
  }

  const { data } = await query
  return NextResponse.json(data ?? [])
}
