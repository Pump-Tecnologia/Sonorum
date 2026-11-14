// Ícones de traço fino, no mesmo desenho da página de lançamento (stroke 1.5).

type IconProps = React.SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const IconChevronLeft = (p: IconProps) => <Base {...p}><path d="m15 6-6 6 6 6" /></Base>
export const IconChevronRight = (p: IconProps) => <Base {...p}><path d="m9 6 6 6-6 6" /></Base>
export const IconClose = (p: IconProps) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>
export const IconPlus = (p: IconProps) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
export const IconArrowRight = (p: IconProps) => <Base {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Base>
export const IconClock = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Base>
export const IconDoor = (p: IconProps) => <Base {...p}><path d="M5 20.5h14" /><path d="M7 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><circle cx="14" cy="12.5" r=".6" fill="currentColor" stroke="none" /></Base>
export const IconNote = (p: IconProps) => <Base {...p}><path d="M6 3.5h9l3 3v14H6z" /><path d="M9 11h6M9 14.5h6M9 18h3" /></Base>
export const IconRepeat = (p: IconProps) => <Base {...p}><path d="M4 11V9a3 3 0 0 1 3-3h12" /><path d="m16 3 3 3-3 3" /><path d="M20 13v2a3 3 0 0 1-3 3H5" /><path d="m8 21-3-3 3-3" /></Base>
