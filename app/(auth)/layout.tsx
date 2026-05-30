import Link from 'next/link'

// Layout de autenticação: painel de marca à esquerda, formulário à direita.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/40 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-400/25 blur-3xl"
        />
        <Link href="/" className="relative text-2xl font-bold tracking-tight text-white">
          Sonorum
        </Link>
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight text-white">
            A regência da sua escola de música, num só lugar.
          </p>
          <p className="mt-4 text-brand-100">
            Agenda, alunos, professores, materiais e financeiro — afinados.
          </p>
        </div>
        <p className="relative text-sm text-brand-200">© Sonorum</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-block text-xl font-bold tracking-tight text-brand-700 lg:hidden"
          >
            Sonorum
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
