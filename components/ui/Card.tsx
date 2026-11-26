import { cn } from '@/lib/cn'

// Superfície de vidro do padrão novo (.sn-card em app/globals.css).
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('sn-card', className)} {...props} />
}
