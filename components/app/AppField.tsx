import styles from '@/components/app/app.module.css'

interface AppFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function AppField({ label, htmlFor, error, hint, children }: AppFieldProps) {
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

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}
export function AppInput({ invalid, className, ...props }: AppInputProps) {
  return (
    <input
      className={`${styles.input} ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}
export function AppSelect({ invalid, className, children, ...props }: AppSelectProps) {
  return (
    <select
      className={`${styles.select} ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
}

interface AppTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}
export function AppTextarea({ invalid, className, ...props }: AppTextareaProps) {
  return (
    <textarea
      className={`${styles.textarea} ${className ?? ''}`.trim()}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}
