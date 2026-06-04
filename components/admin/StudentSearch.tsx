'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Input } from '@/components/ui/Field'

// Busca de aluno por nome/e-mail. Submete via querystring (?q=) — server filtra.
export function StudentSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/admin/students?q=${encodeURIComponent(q)}` : '/admin/students')
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar aluno por nome ou e-mail…"
        aria-label="Buscar aluno"
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
