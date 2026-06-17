'use client'

import { useEffect, useState } from 'react'
import styles from '@/components/marketing/blog.module.css'

export function PostProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = document.documentElement
      const scrolled = el.scrollTop || document.body.scrollTop
      const total = el.scrollHeight - el.clientHeight
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className={styles.progressBar} aria-hidden>
      <div className={styles.progressFill} style={{ width: `${progress}%` }} />
    </div>
  )
}
