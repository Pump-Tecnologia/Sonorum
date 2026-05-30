// SVGs inline usados pela LP — sem dependência de ícones externos.
const base = { fill: 'none' as const, stroke: 'currentColor' }

export const IconArrow = (p: { size?: number }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" {...base} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17l10-10M7 7h10v10" />
  </svg>
)

export const IconCheck = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" {...base} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const IconClock = (p: { size?: number }) => (
  <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 24 24" {...base} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

export const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
)

export const IconWallet = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <circle cx="18" cy="13" r="1" />
  </svg>
)

export const IconChart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth="2">
    <path d="M3 3v18h18M7 16V8m5 8V4m5 12v-6" />
  </svg>
)

export const IconGrad = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth="2">
    <path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
  </svg>
)
