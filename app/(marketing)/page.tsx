import Link from 'next/link'

import { Button } from '@/components/ui/Button'

const FEATURES = [
  {
    title: 'Agenda afinada',
    body: 'Aulas, professores e salas numa agenda visual. Sem conflito de horário, sem planilha.',
    span: 'sm:col-span-2',
  },
  {
    title: 'Alunos & evolução',
    body: 'Metas, notas e relatórios de desempenho de cada aluno num lugar só.',
    span: '',
  },
  {
    title: 'Financeiro sem dor',
    body: 'Planos, matrículas e cobranças com status claro de quem pagou.',
    span: '',
  },
  {
    title: 'Biblioteca pedagógica',
    body: 'Materiais e recursos por instrumento, compartilhados com a turma.',
    span: 'sm:col-span-2',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-40 top-40 h-[24rem] w-[24rem] rounded-full bg-accent-200/40 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700 uppercase">
            Para escolas de música
          </p>
          <h1
            id="hero-heading"
            className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-7xl"
          >
            A regência da sua escola, <span className="text-brand-600">em compasso</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            Agenda, alunos, professores, materiais e financeiro — afinados numa só
            plataforma, leve e rápida.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button className="px-6 py-3 text-base">Criar conta grátis</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-6 py-3 text-base">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bento de features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-3xl border border-hairline bg-surface p-7 transition-shadow hover:shadow-brand ${f.span}`}
            >
              <h2 className="text-lg font-semibold text-ink">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-8 py-14 text-center">
          <div
            aria-hidden
            className="absolute -bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent-400/20 blur-3xl"
          />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
            Comece hoje, sem cartão.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-brand-100">
            Plano Essencial grátis: até 5 alunos, sem cartão. Crie a conta em menos de um minuto.
          </p>
          <div className="relative mt-7">
            <Link href="/register">
              <Button className="bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
