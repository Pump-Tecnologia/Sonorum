// Placeholder enquanto a feature da fase correspondente não foi migrada.
export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-surface p-10 text-center">
      <p className="text-sm font-medium text-ink">Em construção</p>
      <p className="mt-1 text-sm text-ink-muted">
        Esta área será migrada na <span className="font-semibold text-brand-600">{phase}</span>.
      </p>
    </div>
  )
}
