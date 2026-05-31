import styles from '@/components/app/app.module.css'

export function AppTable({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  )
}

export function AppEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className={styles.tableEmpty}>
        {children}
      </td>
    </tr>
  )
}

// Helpers para nome principal + texto auxiliar / colunas em texto muted
export const cellPrimary = styles.cellPrimary
export const cellSub = styles.cellSub
export const cellMuted = styles.cellMuted
export const tableRight = styles.tableRight
export const rowActions = styles.rowActions
export const rowLink = styles.rowLink
