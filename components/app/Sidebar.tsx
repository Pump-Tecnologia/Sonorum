'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import styles from '@/components/app/app.module.css'
import { NavIcon } from '@/components/app/NavIcon'
import { signOut } from '@/lib/auth/actions'
import { cn } from '@/lib/cn'
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/constants/nav'
import type { Role } from '@/lib/constants/roles'

const LOGO = '/brand/logo-vazado.png'
const STORAGE_KEY = 'sonorum:sidebar-collapsed'
const STORAGE_EVENT = 'sonorum:sidebar-storage'

// Iniciais para o avatar: primeira letra do primeiro e do último nome.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

function subscribeCollapsed(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(STORAGE_EVENT, callback)
  }
}

function getCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function getCollapsedServerSnapshot() {
  return false
}

interface SidebarProps {
  role: Role
  name: string
  schoolName: string | null
  logoUrl?: string | null
  brandWord?: string
  // Conta presa a 1 professor (Essencial, Solo, Solo Pro): quem dá aula é o
  // próprio admin, então o item "Professores" (gestão de equipe) não se aplica.
  soloAccount?: boolean
}

export function Sidebar({ role, name, schoolName, logoUrl, brandWord = 'Sonorum', soloAccount = false }: SidebarProps) {
  const pathname = usePathname()
  const items = soloAccount
    ? NAV_BY_ROLE[role].filter((item) => item.href !== '/admin/teachers')
    : NAV_BY_ROLE[role]
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  )

  const mobileDialog = useRef<HTMLDialogElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  function closeMobile() {
    mobileDialog.current?.close()
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 769px)')
    const closeOnDesktop = () => { if (desktop.matches) closeMobile() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileOpen])

  function toggle() {
    const next = !collapsed
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch {
      // Se o armazenamento estiver indisponível, mantém o estado padrão.
    }
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

  const content = (compact: boolean, mobile = false) => (
    <>
      <div className={styles.sidebarHeader}>
        <Link href="/dashboard" onClick={mobile ? closeMobile : undefined} className={styles.sidebarBrand} aria-label={brandWord}>
          <Image
            src={logoUrl ?? LOGO}
            alt=""
            width={36}
            height={36}
            priority
            unoptimized={Boolean(logoUrl)}
            className={styles.sidebarBrandMark}
          />
          {!compact && (
            <span className={styles.sidebarBrandStack}>
              <span className={styles.sidebarBrandWord}>{brandWord}</span>
              {schoolName && schoolName !== brandWord && (
                <span className={styles.sidebarSchool}>{schoolName}</span>
              )}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={mobile ? closeMobile : toggle}
          className={mobile ? styles.mobileCloseBtn : styles.collapseBtn}
          aria-label={mobile ? 'Fechar menu' : compact ? 'Expandir menu' : 'Recolher menu'}
          title={mobile ? 'Fechar menu' : compact ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={mobile ? undefined : !compact}
        >
          <svg
            width={mobile ? 18 : 14}
            height={mobile ? 18 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(styles.collapseChevron, compact && styles.collapseChevronFlipped)}
          >
            <path d={mobile ? "M6 6l12 12M18 6 6 18" : "m15 18-6-6 6-6"} />
          </svg>
        </button>
      </div>

      <nav className={styles.sidebarNav} aria-label="Navegação principal">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={mobile ? closeMobile : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
            title={item.label}
            aria-label={item.label}
            className={cn(styles.sidebarLink, isActive(item.href) && styles.sidebarLinkActive)}
          >
            <NavIcon name={item.icon} size={20} className={styles.sidebarLinkIcon} />
            {!compact && <span className={styles.sidebarLinkLabel}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link
          href="/profile"
          onClick={mobile ? closeMobile : undefined}
          className={styles.sidebarUser}
          title={compact ? `${name} · ${ROLE_LABEL[role]}` : undefined}
          aria-label={compact ? `Perfil de ${name}` : undefined}
        >
          <span className={styles.sidebarAvatar} aria-hidden="true">{initials(name)}</span>
          {!compact && (
            <span className={styles.sidebarUserText}>
              <span className={styles.sidebarUserName}>{name}</span>
              <span className={styles.sidebarRole}>{ROLE_LABEL[role]}</span>
            </span>
          )}
        </Link>
        <form action={signOut}>
          <button type="submit" className={styles.sidebarSignOut} title="Sair" aria-label="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <header className={styles.mobileHeader}>
        <Link href="/dashboard" className={styles.mobileBrand} aria-label={brandWord}>
          <Image src={logoUrl ?? LOGO} alt="" width={32} height={32} unoptimized={Boolean(logoUrl)} />
          <span>{brandWord}</span>
        </Link>
        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => { mobileDialog.current?.showModal(); setMobileOpen(true) }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>
      <aside className={cn(styles.sidebar, collapsed && styles.sidebarCollapsed)}>
        {content(collapsed)}
      </aside>
      <dialog
        ref={mobileDialog}
        id="mobile-navigation"
        aria-label="Menu de navegação"
        className={styles.mobileDialog}
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMobile()
        }}
      >
        <div className={styles.mobilePanel}>{content(false, true)}</div>
      </dialog>
    </>
  )
}
