import Link from 'next/link'

import { Button } from '@/components/ui/Button'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b border-hairline/60 bg-canvas/80 backdrop-blur">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        >
          <Link href="/" className="text-xl font-bold tracking-tight text-brand-700">
            Sonorum
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink"
            >
              Entrar
            </Link>
            <Link href="/register">
              <Button>Criar conta</Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-ink-muted sm:flex-row">
          <span className="font-semibold text-brand-700">Sonorum</span>
          <span>© Sonorum · Gestão para escolas de música</span>
        </div>
      </footer>
    </div>
  )
}
