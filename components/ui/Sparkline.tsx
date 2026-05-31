interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  /** Limites fixos do eixo Y (ex.: 0..5 p/ notas). Default = min/max da série. */
  min?: number
  max?: number
  className?: string
}

// Mini-gráfico de linha em SVG inline — zero dependência. A cor vem de
// `currentColor`, então o elemento pai define a cor via classe de texto.
export function Sparkline({ values, width = 120, height = 32, min, max, className }: SparklineProps) {
  if (values.length === 0) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />
  }

  const hi = max ?? Math.max(...values)
  const lo = min ?? Math.min(...values)
  const span = hi - lo || 1
  const pad = 3
  const w = width - pad * 2
  const h = height - pad * 2
  const step = values.length > 1 ? w / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = pad + i * step
    const y = pad + h - ((Math.min(Math.max(v, lo), hi) - lo) / span) * h
    return [x, y] as const
  })
  const last = points[points.length - 1]!

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {values.length > 1 && (
        <polyline
          points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />
    </svg>
  )
}
