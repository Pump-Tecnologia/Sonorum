import styles from '@/components/auth/auth.module.css'

interface AuthFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function AuthField({ label, htmlFor, error, hint, children }: AuthFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function AuthInput({ invalid, className, ...props }: AuthInputProps) {
  return (
    <input
      className={`${styles.input} ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}
