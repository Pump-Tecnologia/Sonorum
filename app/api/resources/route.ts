import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { INST_CATEGORIES } from '@/lib/constants/resources'

export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !['admin', 'teacher'].includes(me.role)) return NextResponse.json([], { status: 401 })

  // Neutraliza caracteres estruturais do filtro PostgREST (.or): vírgula e
  // parênteses poderiam injetar/alterar condições. % e * viram curinga inócuo.
  const q = (request.nextUrl.searchParams.get('q')?.trim() ?? '').replace(/[,()]/g, ' ')
  // Categoria do instrumento do aluno (enum fixo) — usada para SUGERIR recursos
  // relevantes quando não há busca textual. Só aceita valores do enum (evita
  // quebrar a sintaxe de filtro do PostgREST).
  const catRaw = request.nextUrl.searchParams.get('category')?.trim() ?? ''
  const cat = (INST_CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : ''
  const supabase = await createClient()

  let query = supabase
    .from('pedagogical_resources')
    .select('id, title, category, instrument, instrument_category, difficulty')
    .order('title')
    .limit(20)

  if (q) {
    // Busca textual livre: título ou instrumento.
    query = query.or(`title.ilike.%${q}%,instrument.ilike.%${q}%`)
  } else if (cat) {
    // Sem busca: prioriza recursos do instrumento do aluno + Geral + sem categoria.
    query = query.or(`instrument_category.eq.${cat},instrument_category.eq.Geral,instrument_category.is.null`)
  }

  const { data } = await query
  return NextResponse.json(data ?? [])
}
