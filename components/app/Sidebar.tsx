'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import styles from '@/components/app/app.module.css'
import { signOut } from '@/lib/auth/actions'
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/constants/nav'
import type { Role } from '@/lib/constants/roles'

const LOGO = '/brand/logo-vazado.png'

interface SidebarProps {
  role: Role
  name: string
  schoolName: string | null
  logoUrl?: string | null
  brandWord?: string
}

export function Sidebar({ role, name, schoolName, logoUrl, brandWord = 'Sonorum' }: SidebarProps) {
  const pathname = usePathname()
  const items = NAV_BY_ROLE[role]

  // Item ativo = o match MAIS específico, não qualquer prefixo. Sem isso, um
  // href "pai" (ex: Dashboard /admin) acende em toda subrota (/admin/teachers,
  // /admin/students…), marcando dois itens ao mesmo tempo.
  const matches = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  const activeHref = items
    .map((item) => item.href)
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0]

  const isActive = (href: string) => href === activeHref

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link href="/dashboard" className={styles.sidebarBrand} aria-label={brandWord}>
          <Image
            src={logoUrl || LOGO}
            alt=""
            width={32}
            height={32}
            priority
            unoptimized={Boolean(logoUrl)}
            className={styles.sidebarBrandMark}
          />
          <span className={styles.sidebarBrandWord}>{brandWord}</span>
        </Link>
        {schoolName && schoolName !== brandWord && <p className={styles.sidebarSchool}>{schoolName}</p>}
      </div>

      <nav className={styles.sidebarNav} aria-label="Navegação principal">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.sidebarLink} ${isActive(item.href) ? styles.sidebarLinkActive : ''}`.trim()}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/profile" className={styles.sidebarUserLink}>
          {name}
        </Link>
        <p className={styles.sidebarRole}>{ROLE_LABEL[role]}</p>
        <form action={signOut}>
          <button type="submit" className={styles.sidebarSignOut}>
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
