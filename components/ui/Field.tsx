import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
  hint?: string
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

const controlBase =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 font-sans text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-brand-500'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      className={cn(controlBase, invalid ? 'border-red-400' : 'border-hairline focus:border-brand-400', className)}
      {...props}
    />
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(controlBase, 'min-h-24 resize-y', invalid ? 'border-red-400' : 'border-hairline focus:border-brand-400', className)}
      {...props}
    />
  )
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(controlBase, 'appearance-none', invalid ? 'border-red-400' : 'border-hairline focus:border-brand-400', className)}
      {...props}
    >
      {children}
    </select>
  )
}
