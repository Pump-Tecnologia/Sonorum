import styles from '@/components/ds/ds.module.css'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>{label}</label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

interface ControlProps { invalid?: boolean }

export function Input({ invalid, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input className={cn(styles.control, className)} aria-invalid={invalid || undefined} {...props} />
}

export function Select({ invalid, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return <select className={cn(styles.control, className)} aria-invalid={invalid || undefined} {...props} />
}

export function Textarea({ invalid, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps) {
  return <textarea className={cn(styles.control, className)} aria-invalid={invalid || undefined} {...props} />
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return <p className={styles.alert} role="alert">{children}</p>
}
