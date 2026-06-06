'use client'

// Botão de imprimir/baixar (PDF via diálogo de impressão do navegador).
export function PrintButton({ label = 'Baixar / Imprimir', className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'inline-flex items-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700'
      }
    >
      {label}
    </button>
  )
}
