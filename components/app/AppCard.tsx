import styles from '@/components/app/app.module.css'

export function AppCard({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`${styles.card} ${className ?? ''}`.trim()}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {children}
    </section>
  )
}
