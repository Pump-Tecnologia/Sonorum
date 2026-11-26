import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
  hint?: string
}

// Campos no visual novo (.sn-field e .sn-control em app/globals.css). Telas novas usam components/ds/Field.
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="sn-field">
      <label htmlFor={htmlFor} className="sn-label">{label}</label>
      {children}
      {hint && !error && <p className="sn-hint">{hint}</p>}
      {error && <p className="sn-error" role="alert">{error}</p>}
    </div>
  )
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export function Input({ invalid, className, ...props }: InputProps) {
  return <input className={cn('sn-control', className)} aria-invalid={invalid || undefined} {...props} />
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return <textarea className={cn('sn-control', className)} aria-invalid={invalid || undefined} {...props} />
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select className={cn('sn-control', className)} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  )
}
