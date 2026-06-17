'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import type { PostMeta } from '@/lib/blog'
import { formatDate } from '@/lib/blog-utils'
import mkt from '@/components/marketing/marketing.module.css'
import blog from '@/components/marketing/blog.module.css'

// ── Tema por categoria ────────────────────────────────────────────────────
interface Theme {
  icon: string
  gradient: string
  accentColor: string
}

const THEMES: Record<string, Theme> = {
  Gestão: {
    icon: '📋',
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2d5a8e 100%)',
    accentColor: '#63C08F',
  },
  Financeiro: {
    icon: '💰',
    gradient: 'linear-gradient(135deg, #163d26 0%, #2e7d52 100%)',
    accentColor: '#A8DCC1',
  },
  Crescimento: {
    icon: '📈',
    gradient: 'linear-gradient(135deg, #1a2a4a 0%, #1d4ed8 100%)',
    accentColor: '#93c5fd',
  },
}

function getTheme(category: string): Theme {
  return THEMES[category] ?? {
    icon: '🎵',
    gradient: 'linear-gradient(135deg, #1F3A5F 0%, #2B2E34 100%)',
    accentColor: '#63C08F',
  }
}

// ── Sub-componentes ───────────────────────────────────────────────────────

function Thumbnail({
  category,
  coverImage,
  size = 'md',
}: {
  category: string
  coverImage?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const t = getTheme(category)
  const cls =
    size === 'lg'
      ? blog.thumbLg
      : size === 'sm'
        ? blog.thumbSm
        : blog.thumbMd

  if (coverImage) {
    return (
      <div className={`${cls} ${blog.thumbPhoto}`} aria-hidden>
        <Image src={coverImage} alt="" fill sizes="(max-width:768px) 100vw, 400px" className={blog.thumbPhotoImg} />
      </div>
    )
  }

  return (
    <div className={cls} style={{ background: t.gradient }} aria-hidden>
      <div className={blog.thumbDeco} style={{ borderColor: t.accentColor }} />
    </div>
  )
}

function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className={blog.card}>
      <Thumbnail category={post.category} coverImage={post.coverImage} size="md" />
      <div className={blog.cardBody}>
        <span className={blog.cardCat}>{post.category}</span>
        <h3 className={blog.cardTitle}>{post.title}</h3>
        <p className={blog.cardDesc}>{post.description}</p>
        <div className={blog.cardMeta}>
          <span>{formatDate(post.date)}</span>
          <span className={blog.metaSep}>·</span>
          <span>{post.readingTime} min</span>
        </div>
      </div>
    </Link>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

interface BlogListingProps {
  posts: PostMeta[]
}

export function BlogListing({ posts }: BlogListingProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(() => {
    const map: Record<string, number> = {}
    posts.forEach((p) => {
      map[p.category] = (map[p.category] ?? 0) + 1
    })
    return map
  }, [posts])

  const filtered = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts

  const [featured, ...rest] = filtered
  const recent = posts.slice(0, 5)

  function toggleCat(cat: string) {
    setActiveCategory((prev) => (prev === cat ? null : cat))
  }

  return (
    <>
      {/* ── Filtro por categoria ── */}
      <div className={blog.filterBar}>
        <div className={mkt.container}>
          <div className={blog.filterInner}>
            <button
              className={`${blog.pill} ${!activeCategory ? blog.pillActive : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              Todos
              <span className={blog.pillCount}>{posts.length}</span>
            </button>

            {Object.entries(categories).map(([cat, count]) => (
              <button
                key={cat}
                className={`${blog.pill} ${activeCategory === cat ? blog.pillActive : ''}`}
                onClick={() => toggleCat(cat)}
              >
                {cat}
                <span className={blog.pillCount}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <section className={blog.main}>
        <div className={mkt.container}>
          {posts.length === 0 ? (
            <div className={blog.emptyState}>
              <p>Nenhum post publicado ainda. Em breve!</p>
            </div>
          ) : (
            <div className={blog.layout}>
              {/* Coluna de conteúdo */}
              <div className={blog.content}>
                {filtered.length === 0 ? (
                  <div className={blog.emptyState}>
                    <p>Nenhum post nessa categoria ainda.</p>
                  </div>
                ) : (
                  <>
                    {/* Post em destaque */}
                    {featured && (
                      <Link href={`/blog/${featured.slug}`} className={blog.featured}>
                        <Thumbnail category={featured.category} coverImage={featured.coverImage} size="lg" />

                        <div className={blog.featuredBody}>
                          <span className={blog.featuredBadge}>{featured.category}</span>
                          <h2 className={blog.featuredTitle}>{featured.title}</h2>
                          <p className={blog.featuredDesc}>{featured.description}</p>

                          <div className={blog.featuredMeta}>
                            <span>{featured.author}</span>
                            <span className={blog.metaSep}>·</span>
                            <span>{formatDate(featured.date)}</span>
                            <span className={blog.metaSep}>·</span>
                            <span>{featured.readingTime} min de leitura</span>
                          </div>

                          <span className={blog.featuredCta}>Ler artigo →</span>
                        </div>
                      </Link>
                    )}

                    {/* Grid de posts */}
                    {rest.length > 0 && (
                      <>
                        <p className={blog.gridLabel}>Mais artigos</p>
                        <div className={blog.grid}>
                          {rest.map((post) => (
                            <PostCard key={post.slug} post={post} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Sidebar */}
              <aside className={blog.sidebar}>
                {/* Widget: Categorias */}
                <div className={blog.widget}>
                  <h3 className={blog.widgetTitle}>Categorias</h3>
                  <ul className={blog.catList}>
                    {Object.entries(categories).map(([cat, count]) => (
                      <li key={cat}>
                        <button
                          className={`${blog.catItem} ${activeCategory === cat ? blog.catItemActive : ''}`}
                          onClick={() => toggleCat(cat)}
                        >
                          <span className={blog.catItemLabel}>{cat}</span>
                          <span className={blog.catCount}>{count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Widget: Artigos recentes */}
                <div className={blog.widget}>
                  <h3 className={blog.widgetTitle}>Artigos Recentes</h3>
                  <ul className={blog.recentList}>
                    {recent.map((post) => (
                      <li key={post.slug}>
                        <Link href={`/blog/${post.slug}`} className={blog.recentItem}>
                          <div
                            className={blog.recentThumb}
                            style={post.coverImage ? undefined : { background: getTheme(post.category).gradient }}
                            aria-hidden
                          >
                            {post.coverImage ? (
                              <Image src={post.coverImage} alt="" fill sizes="64px" className={blog.relatedThumbImg} />
                            ) : null}
                          </div>
                          <div className={blog.recentInfo}>
                            <p className={blog.recentTitle}>{post.title}</p>
                            <p className={blog.recentDate}>{formatDate(post.date)}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Widget: CTA */}
                <div className={blog.sidebarCta}>
                  <p className={blog.sidebarCtaLabel}>Experimente grátis</p>
                  <p className={blog.sidebarCtaTitle}>
                    Gerencie sua escola com o Sonorum
                  </p>
                  <p className={blog.sidebarCtaText}>
                    Agenda, financeiro e comunicação com alunos em um lugar só.
                  </p>
                  <Link href="/register" className={blog.sidebarCtaBtn}>
                    Criar conta grátis →
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
