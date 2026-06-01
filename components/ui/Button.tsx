import Link from 'next/link'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-brand disabled:bg-brand-300',
  secondary:
    'bg-surface text-ink border border-hairline hover:bg-surface-muted hover:border-brand-300 active:bg-surface-muted',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-muted',
  danger:
    'bg-surface text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 active:bg-red-100',
}

const SIZES: Record<Size, string> = {
  sm: 'gap-1.5 rounded-lg px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-xl px-4 py-2.5 text-sm',
}

const BASE =
  'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(BASE, SIZES[size], VARIANTS[variant], className)} {...props} />
}

interface LinkButtonProps extends Omit<React.ComponentProps<typeof Link>, 'className'> {
  variant?: Variant
  size?: Size
  className?: string
}

// Link com aparência de botão — para ações que redirecionam (Editar, Ver mais, etc.).
export function LinkButton({ variant = 'secondary', size = 'sm', className, ...props }: LinkButtonProps) {
  return <Link className={cn(BASE, SIZES[size], VARIANTS[variant], className)} {...props} />
}
