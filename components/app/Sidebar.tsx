'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import styles from '@/components/app/app.module.css'
import { NavIcon } from '@/components/app/NavIcon'
import { signOut } from '@/lib/auth/actions'
import { cn } from '@/lib/cn'
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/constants/nav'
import type { Role } from '@/lib/constants/roles'

const LOGO = '/brand/logo-vazado.png'
const STORAGE_KEY = 'sonorum:sidebar-collapsed'

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
  const [collapsed, setCollapsed] = useState(false)

  // Persiste o estado entre navegações/reloads (sem flash de hidratação: lê só
  // depois de montar).
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

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
    <aside className={cn(styles.sidebar, collapsed && styles.sidebarCollapsed)}>
      <div className={styles.sidebarHeader}>
        {/* Quadrado branco arredondado atrás da logo (padrão Sonorum ou
            customizada do Premium) — garante contraste universal e evita
            conflito de cores entre logos. */}
        <Link href="/dashboard" className={styles.sidebarBrandTile} aria-label={brandWord}>
          <Image
            src={logoUrl ?? LOGO}
            alt=""
            width={44}
            height={44}
            priority
            unoptimized={Boolean(logoUrl)}
            className={styles.sidebarBrandMark}
          />
        </Link>
        {!collapsed && (
          <div className={styles.sidebarBrandStack}>
            <span className={styles.sidebarBrandWord}>{brandWord}</span>
            {schoolName && schoolName !== brandWord && (
              <span className={styles.sidebarSchool}>{schoolName}</span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        className={styles.collapseBtn}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!collapsed}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(styles.collapseChevron, collapsed && styles.collapseChevronFlipped)}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {!collapsed && <span>Recolher</span>}
      </button>

      <nav className={styles.sidebarNav} aria-label="Navegação principal">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={cn(styles.sidebarLink, isActive(item.href) && styles.sidebarLinkActive)}
          >
            <NavIcon name={item.icon} size={20} className={styles.sidebarLinkIcon} />
            {!collapsed && <span className={styles.sidebarLinkLabel}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        {!collapsed && (
          <>
            <Link href="/profile" className={styles.sidebarUserLink}>
              {name}
            </Link>
            <p className={styles.sidebarRole}>{ROLE_LABEL[role]}</p>
          </>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className={styles.sidebarSignOut}
            title="Sair"
            aria-label="Sair"
          >
            {collapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5M21 12H9" />
              </svg>
            ) : (
              'Sair'
            )}
          </button>
        </form>
      </div>
    </aside>
  )
}
