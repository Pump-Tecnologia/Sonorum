import { stopImpersonating } from '@/lib/actions/impersonate'

export function ImpersonationBanner({ asUserName }: { asUserName: string }) {
  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-sm">
        <p>
          <span className="font-semibold">Visualizando como </span>
          <span className="font-bold">{asUserName}</span>
          <span className="ml-2 text-amber-800">— você está em modo de impersonação</span>
        </p>
        <form action={stopImpersonating}>
          <button
            type="submit"
            className="rounded-lg bg-amber-950/10 px-3 py-1 text-xs font-semibold hover:bg-amber-950/20"
          >
            Voltar para minha conta
          </button>
        </form>
      </div>
    </div>
  )
}
