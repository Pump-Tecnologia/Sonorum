import Link from 'next/link'

import styles from '@/components/app/app.module.css'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  outline: styles.btnOutline,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
}

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function AppButton({ variant = 'primary', className, ...props }: AppButtonProps) {
  return (
    <button
      className={`${styles.btn} ${VARIANT_CLASS[variant]} ${className ?? ''}`.trim()}
      {...props}
    />
  )
}

interface AppLinkButtonProps {
  href: string
  variant?: Variant
  children: React.ReactNode
}

export function AppLinkButton({ href, variant = 'primary', children }: AppLinkButtonProps) {
  return (
    <Link href={href} className={`${styles.btn} ${VARIANT_CLASS[variant]}`}>
      {children}
    </Link>
  )
}
