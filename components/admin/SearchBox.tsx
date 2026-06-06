'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Input } from '@/components/ui/Field'

// Busca genérica por nome/e-mail. Submete via querystring (?q=) — server filtra.
export function SearchBox({
  basePath,
  defaultValue,
  placeholder,
  label,
}: {
  basePath: string
  defaultValue: string
  placeholder: string
  label: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath)
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
      >
        Buscar
      </button>
    </form>
  )
}
