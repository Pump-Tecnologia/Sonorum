import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { CATEGORIES, DIFFICULTIES, INST_CATEGORIES } from '@/lib/constants/resources'

export async function GET(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !['admin', 'teacher'].includes(me.role)) return NextResponse.json([], { status: 401 })

  const sp = request.nextUrl.searchParams
  // Neutraliza caracteres estruturais do filtro PostgREST (.or): vírgula e
  // parênteses poderiam injetar/alterar condições. % e * viram curinga inócuo.
  const q = (sp.get('q')?.trim() ?? '').replace(/[,()]/g, ' ')
  // Categoria do RECURSO (Aquecimento/Técnica/Teoria/Repertório/Tarefa de Casa).
  const catRaw = sp.get('category')?.trim() ?? ''
  const category = (CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : ''
  // Categoria do INSTRUMENTO do aluno (para sugerir recursos relevantes).
  const instRaw = sp.get('instrumentCategory')?.trim() ?? ''
  const instrumentCategory = (INST_CATEGORIES as readonly string[]).includes(instRaw) ? instRaw : ''
  const diffRaw = sp.get('difficulty')?.trim() ?? ''
  const difficulty = (DIFFICULTIES as readonly string[]).includes(diffRaw) ? diffRaw : ''

  const supabase = await createClient()
  let query = supabase
    .from('pedagogical_resources')
    .select('id, title, category, instrument, instrument_category, difficulty')
    .order('title')
    .limit(30)

  if (category) query = query.eq('category', category)
  if (difficulty) query = query.eq('difficulty', difficulty)

  if (q) {
    // Busca textual: título ou instrumento (dentro dos filtros acima).
    query = query.or(`title.ilike.%${q}%,instrument.ilike.%${q}%`)
  } else if (instrumentCategory) {
    // Sem busca: prioriza recursos do instrumento do aluno + Geral + sem categoria.
    query = query.or(`instrument_category.eq.${instrumentCategory},instrument_category.eq.Geral,instrument_category.is.null`)
  }

  const { data } = await query
  return NextResponse.json(data ?? [])
}
