import { LinkButton, SubmitButton } from '@/components/ds/Button'
import { IconPlus } from '@/components/ds/icons'
import { NewResourceTile, ResourceCard, ResourceRow, Shelf, type ResourceItem } from '@/components/resources/ResourceCard'
import { ResourceFilters } from '@/components/resources/ResourceFilters'
import styles from '@/components/resources/resources.module.css'
import { restoreLibrary } from '@/lib/actions/resources'
import { CATEGORIES, DIFFICULTIES, INST_CATEGORIES } from '@/lib/constants/resources'
import { createClient } from '@/lib/supabase/server'
import { signedResourceUrls } from '@/lib/storage/resources'

export const metadata = { title: 'Recursos pedagógicos' }

type SearchParams = { q?: string; category?: string; instrument?: string; difficulty?: string; view?: string }

function pick(value: string | undefined, allowed: readonly string[]): string {
  return value && allowed.includes(value) ? value : ''
}

/** Compara sem acento e sem caixa ("violao" acha "Violão"). */
function fold(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const area = pick(sp.instrument, INST_CATEGORIES)
  const cat = pick(sp.category, CATEGORIES)
  const diff = pick(sp.difficulty, DIFFICULTIES)
  const view = sp.view === 'list' ? 'list' : 'shelves'

  // A biblioteca de uma escola é pequena: busca tudo e filtra aqui, para as
  // abas mostrarem quantos recursos cada área tem com os filtros atuais.
  const supabase = await createClient()
  const { data } = await supabase
    .from('pedagogical_resources')
    .select('id, title, description, category, difficulty, content_type, instrument, instrument_category, content_link, file_path, template_id, customized')
    .order('created_at', { ascending: false })

  const term = fold(q)
  const matchesExtras = (r: ResourceItem) =>
    (!cat || r.category === cat) &&
    (!diff || r.difficulty === diff) &&
    (!term || [r.title, r.description, r.instrument].some((t) => fold(t).includes(term)))

  const pool = (data ?? []).filter(matchesExtras)
  const list = area ? pool.filter((r) => (r.instrument_category ?? 'Geral') === area) : pool

  const areaCounts = new Map<string, number>()
  for (const r of pool) {
    const key = r.instrument_category ?? 'Geral'
    areaCounts.set(key, (areaCounts.get(key) ?? 0) + 1)
  }
  const areas = INST_CATEGORIES.filter((c) => areaCounts.has(c) || c === area).map((c) => ({ value: c, count: areaCounts.get(c) ?? 0 }))

  const fileUrls = await signedResourceUrls(list.map((r) => r.file_path))
  const urlOf = (path: string | null) => (path ? fileUrls[path] ?? null : null)

  const own = list.filter((r) => !r.template_id)
  const catalog = list.filter((r) => r.template_id)
  const filtered = Boolean(q || area || cat || diff)
  const count = `${list.length} ${list.length === 1 ? 'recurso' : 'recursos'}`

  return (
    <section className={styles.page} aria-labelledby="resources-title">
      <header className={styles.header}>
        <div>
          <h1 id="resources-title" className={styles.kicker}>Recursos pedagógicos</h1>
          <p className={styles.title}>{filtered ? `${count} no filtro` : count}</p>
          <p className={styles.lead}>O material das suas aulas. Use nas aulas e o aluno encontra tudo no portal dele.</p>
        </div>
        <div className={styles.actions}>
          <form action={restoreLibrary}>
            <SubmitButton variant="soft" pendingLabel="Restaurando…">Restaurar biblioteca</SubmitButton>
          </form>
          <LinkButton href="/resources/new"><IconPlus /> Novo recurso</LinkButton>
        </div>
      </header>

      <ResourceFilters q={q} area={area} cat={cat} diff={diff} view={view} areas={areas} total={pool.length} />

      {view === 'list' ? (
        list.length === 0 ? (
          <p className={styles.empty}>Nenhum recurso com esses filtros. Tente outra área ou limpe os filtros.</p>
        ) : (
          <ul className={styles.list} aria-label="Recursos">
            {list.map((r) => <ResourceRow key={r.id} r={r} fileUrl={urlOf(r.file_path)} />)}
          </ul>
        )
      ) : (
        <>
          <Shelf id="shelf-own" title="Criados pela escola" hint="Os recursos que você e os professores montaram." count={own.length}>
            <NewResourceTile index={0} />
            {own.map((r, i) => <ResourceCard key={r.id} r={r} fileUrl={urlOf(r.file_path)} mode="teacher" index={i + 1} />)}
          </Shelf>
          {catalog.length > 0 && (
            <Shelf id="shelf-catalog" title="Do catálogo do Sonorum" hint="Prontos para usar. Você pode editar a sua cópia quando quiser." count={catalog.length}>
              {catalog.map((r, i) => <ResourceCard key={r.id} r={r} fileUrl={urlOf(r.file_path)} mode="teacher" index={i} />)}
            </Shelf>
          )}
          {filtered && list.length === 0 && (
            <p className={styles.empty}>Nenhum recurso com esses filtros. Tente outra área ou limpe os filtros.</p>
          )}
        </>
      )}
    </section>
  )
}
