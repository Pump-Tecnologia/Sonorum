import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'

import { getAllPosts, getPostBySlug, formatDate } from '@/lib/blog'
import { PostProgress } from '@/components/marketing/PostProgress'
import styles from '@/components/marketing/marketing.module.css'
import blog from '@/components/marketing/blog.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

/* ── Gradiente por categoria (espelha os thumbnails da listagem) ── */
const CATEGORY_THEME: Record<string, { gradient: string; icon: string }> = {
  Gestão:      { gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2d5a8e 100%)', icon: '📋' },
  Financeiro:  { gradient: 'linear-gradient(135deg, #163d26 0%, #2e7d52 100%)', icon: '💰' },
  Crescimento: { gradient: 'linear-gradient(135deg, #1a2a4a 0%, #1d4ed8 100%)', icon: '📈' },
}
const DEFAULT_THEME = { gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2d5a8e 100%)', icon: '📝' }

/* ── Extrai H2s do conteúdo MDX para o TOC ── */
function extractHeadings(content: string): { id: string; text: string }[] {
  const matches = [...content.matchAll(/^## (.+)$/gm)]
  return matches.map((m) => {
    const text = m[1].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
    return { id, text }
  })
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} — Sonorum`,
    description: post.description,
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const theme = CATEGORY_THEME[post.category] ?? DEFAULT_THEME
  const headings = extractHeadings(post.content)

  /* Posts relacionados: mesma categoria, excluindo o atual, máx 2 */
  const related = getAllPosts()
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 2)

  return (
    <>
      <PostProgress />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={blog.postHero}
        style={post.coverImage ? undefined : { background: theme.gradient }}
      >
        {post.coverImage ? (
          <>
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              className={blog.postHeroImg}
              sizes="100vw"
            />
            <div className={blog.postHeroOverlay} aria-hidden />
          </>
        ) : (
          <div className={blog.heroRing} aria-hidden />
        )}

        <div className={`${styles.container} ${blog.postHeroContent}`}>
          {/* Breadcrumb */}
          <nav className={blog.postBreadcrumb} aria-label="Navegação de migalhas">
            <Link href="/blog">← Blog</Link>
            <span aria-hidden>·</span>
            <span>{post.category}</span>
          </nav>

          {/* Badge */}
          <p className={blog.postHeroBadge}>{post.category}</p>

          {/* Título */}
          <h1 className={blog.postHeroTitle}>{post.title}</h1>

          {/* Descrição */}
          <p className={blog.postHeroDesc}>{post.description}</p>

          {/* Autor chip */}
          <div className={blog.postHeroAuthor}>
            <span className={blog.postHeroAvatar}>{post.author.charAt(0)}</span>
            <span className={blog.postHeroAuthorName}>{post.author}</span>
            <span className={blog.postHeroMetaSep} aria-hidden>·</span>
            <span>{formatDate(post.date)}</span>
            <span className={blog.postHeroMetaSep} aria-hidden>·</span>
            <span>{post.readingTime} min de leitura</span>
          </div>
        </div>
      </section>

      {/* ── Corpo ────────────────────────────────────────────────────────── */}
      <section className={blog.postBody}>
        <div className={styles.container}>
          <div className={blog.postLayout}>

            {/* Prose */}
            <article className={blog.prose}>
              <MDXRemote source={post.content} />

              {/* Rodapé do artigo */}
              <div className={blog.postFooter}>
                <Link href="/blog" className={blog.backLink}>
                  ← Voltar ao blog
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside className={blog.postSidebar}>
              {/* TOC */}
              {headings.length > 0 && (
                <div className={blog.widget}>
                  <p className={blog.widgetTitle}>Neste artigo</p>
                  <ol className={blog.tocList}>
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className={blog.tocItem}>
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* CTA */}
              <div className={blog.sidebarCta}>
                <p className={blog.sidebarCtaLabel}>Experimente grátis</p>
                <p className={blog.sidebarCtaTitle}>
                  Gerencie sua escola de música com o Sonorum
                </p>
                <p className={blog.sidebarCtaText}>
                  Agenda, financeiro, comunicação com alunos — tudo em um lugar só.
                </p>
                <Link href="/register" className={blog.sidebarCtaBtn}>
                  Criar conta grátis →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Posts relacionados ────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className={blog.relatedSection}>
          <div className={styles.container}>
            <p className={blog.relatedLabel}>Continue lendo</p>
            <div className={blog.relatedGrid}>
              {related.map((p) => {
                const rt = CATEGORY_THEME[p.category] ?? DEFAULT_THEME
                return (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className={blog.relatedCard}>
                    <div className={blog.relatedThumb} style={p.coverImage ? undefined : { background: rt.gradient }}>
                      {p.coverImage ? (
                        <Image src={p.coverImage} alt="" fill sizes="320px" className={blog.relatedThumbImg} />
                      ) : null}
                    </div>
                    <div className={blog.relatedBody}>
                      <p className={blog.relatedCat}>{p.category}</p>
                      <p className={blog.relatedTitle}>{p.title}</p>
                      <p className={blog.relatedMeta}>{formatDate(p.date)} · {p.readingTime} min</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
