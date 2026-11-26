'use client'

import Link from 'next/link'
import { useFormStatus } from 'react-dom'

import styles from '@/components/ds/ds.module.css'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const VARIANT: Record<ButtonVariant, string> = {
  primary: styles.primary,
  soft: styles.soft,
  ghost: styles.ghost,
  danger: styles.danger,
}

function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cn(styles.button, VARIANT[variant], size === 'sm' && styles.small, className)
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

interface LinkButtonProps {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
}

export function LinkButton({ href, variant = 'primary', size = 'md', className, children }: LinkButtonProps) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>
}

interface SubmitButtonProps {
  children: React.ReactNode
  pendingLabel?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Botão de envio que se desativa e troca o texto enquanto a action roda. */
export function SubmitButton({ children, pendingLabel = 'Aguarde…', variant = 'primary', size = 'md', className }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={buttonClass(variant, size, className)} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Obrigatório: o botão só tem ícone, então o nome vem daqui. */
  label: string
  quiet?: boolean
}

export function IconButton({ label, quiet = false, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.iconButton, quiet && styles.iconButtonQuiet, className)}
      {...props}
    />
  )
}
