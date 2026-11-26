import Link from 'next/link'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'sn-btn-primary',
  secondary: 'sn-btn-secondary',
  ghost: 'sn-btn-ghost',
  danger: 'sn-btn-danger',
}

// Botão em pílula do padrão novo (.sn-btn em app/globals.css). Telas novas usam components/ds/Button.
function buttonClass(variant: Variant, size: Size, className?: string): string {
  return cn('sn-btn', size === 'sm' && 'sn-btn-sm', VARIANTS[variant], className)
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />
}

interface LinkButtonProps extends Omit<React.ComponentProps<typeof Link>, 'className'> {
  variant?: Variant
  size?: Size
  className?: string
}

// Link com aparência de botão — para ações que redirecionam (Editar, Ver mais, etc.).
export function LinkButton({ variant = 'secondary', size = 'sm', className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}
