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
export const IconSearch = (p: IconProps) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Base>
export const IconMore = (p: IconProps) => <Base {...p}><circle cx="5.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1" fill="currentColor" stroke="none" /></Base>
export const IconUpload = (p: IconProps) => <Base {...p}><path d="M12 15V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" /></Base>
export const IconCheck = (p: IconProps) => <Base {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>
export const IconArrowLeft = (p: IconProps) => <Base {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Base>
export const IconTrash = (p: IconProps) => <Base {...p}><path d="M4.5 7h15" /><path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12.5" /></Base>
export const IconInfo = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" stroke="none" /></Base>
export const IconPlay = (p: IconProps) => <Base {...p}><path d="M8 5.5v13l10.5-6.5z" /></Base>
export const IconExternal = (p: IconProps) => <Base {...p}><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10" /></Base>
export const IconChevronDown = (p: IconProps) => <Base {...p}><path d="m6 9 6 6 6-6" /></Base>
