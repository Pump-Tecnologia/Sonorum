'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { IconArrowRight, IconSearch } from '@/components/ds/icons'
import styles from '@/components/admin/students.module.css'

// Busca por nome/e-mail (alunos, professores). Submete via querystring (?q=) — server filtra.
// Pílula de vidro com botão redondo, como o campo da página de lançamento.
export function StudentSearch({
  defaultValue,
  basePath = '/admin/students',
  label = 'Buscar aluno',
}: {
  defaultValue: string
  basePath?: string
  label?: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath)
  }

  return (
    <form onSubmit={submit} role="search" className={styles.search}>
      <IconSearch className={styles.searchIcon} />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nome ou e-mail"
        aria-label={label}
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchButton} aria-label="Buscar" title="Buscar">
        <IconArrowRight />
      </button>
    </form>
  )
}
