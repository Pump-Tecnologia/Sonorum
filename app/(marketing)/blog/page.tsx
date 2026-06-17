import type { Metadata } from 'next'

import { getAllPosts } from '@/lib/blog'
import { BlogListing } from '@/components/marketing/BlogListing'
import styles from '@/components/marketing/marketing.module.css'
import blog from '@/components/marketing/blog.module.css'

export const metadata: Metadata = {
  title: 'Blog — Sonorum',
  description:
    'Dicas práticas de gestão para escolas de música: agenda, financeiro, comunicação com alunos e muito mais.',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <>
      {/* Topo da página */}
      <section className={blog.blogTop}>
        <div className={styles.container}>
          <div className={blog.blogTopInner}>
            <h1 className={blog.blogTopTitle}>Blog</h1>
            <p className={blog.blogTopSub}>
              Gestão, educação musical e tudo que ajuda sua escola a crescer.
            </p>
          </div>
        </div>
      </section>

      {/* Listagem com filtro + magazine layout */}
      <BlogListing posts={posts} />
    </>
  )
}
