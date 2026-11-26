// Lista em vidro do padrão novo (.sn-table em app/globals.css).
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="sn-table-wrap">
      <table className="sn-table">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={className}>{children}</th>
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={className}>{children}</td>
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="sn-table-empty">
        {children}
      </td>
    </tr>
  )
}
