'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/constants/nav'
import type { Role } from '@/lib/constants/roles'
import { signOut } from '@/lib/auth/actions'
import { cn } from '@/lib/cn'

interface SidebarProps {
  role: Role
  name: string
  schoolName: string | null
}

export function Sidebar({ role, name, schoolName }: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_BY_ROLE[role]

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  return (
    <aside className="flex h-dvh w-64 flex-col border-r border-hairline bg-surface">
      <div className="px-6 py-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-brand-700">
          Sonorum
        </Link>
        {schoolName && <p className="mt-1 truncate text-xs text-ink-muted">{schoolName}</p>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-hairline p-4">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="mb-3 text-xs text-ink-muted">{ROLE_LABEL[role]}</p>
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full justify-center text-sm">
            Sair
          </Button>
        </form>
      </div>
    </aside>
  )
}
