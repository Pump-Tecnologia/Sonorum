import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export { formatDate } from '@/lib/blog-utils'

const POSTS_DIR = path.join(process.cwd(), 'content/blog')

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string          // ISO: "2026-06-17"
  author: string
  category: string
  readingTime: number   // minutos (estimado)
  coverImage?: string
}

export interface Post extends PostMeta {
  content: string
}

function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return []

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'))

  const posts: PostMeta[] = files.map((filename) => {
    const slug = filename.replace(/\.mdx$/, '')
    const fullPath = path.join(POSTS_DIR, filename)
    const raw = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(raw)

    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      date: data.date ?? '',
      author: data.author ?? 'Sonorum',
      category: data.category ?? 'Gestão',
      readingTime: estimateReadingTime(content),
      coverImage: data.coverImage,
    }
  })

  // Ordem cronológica reversa
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPostBySlug(slug: string): Post | null {
  const fullPath = path.join(POSTS_DIR, `${slug}.mdx`)
  if (!fs.existsSync(fullPath)) return null

  const raw = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ?? '',
    author: data.author ?? 'Sonorum',
    category: data.category ?? 'Gestão',
    readingTime: estimateReadingTime(content),
    coverImage: data.coverImage,
    content,
  }
}

