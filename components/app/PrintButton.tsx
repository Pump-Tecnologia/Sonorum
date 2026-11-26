'use client'

// Botão de imprimir/baixar (PDF via diálogo de impressão do navegador).
export function PrintButton({ label = 'Baixar ou imprimir', className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'sn-btn sn-btn-primary'
      }
    >
      {label}
    </button>
  )
}
