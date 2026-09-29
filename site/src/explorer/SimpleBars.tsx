export type Bar = { label: string; value: number }

const W = 560
const wrap = (label: string, n = 13) => {
  const words = label.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 2).map((l, i, a) => (i === a.length - 1 && lines.length > 2 ? l + '…' : l))
}

/** A small, dependable bar chart: categorical labels, value labels, a baseline and gridlines. */
export function SimpleBars({ data, height = 200, max, format = (v) => String(v), color = '#edff45', label }: {
  data: Bar[]; height?: number; max?: number; format?: (v: number) => string; color?: string; label: string
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value)) * 1.15
  const padL = 36, padR = 8, padT = 22, padB = 40
  const plotW = W - padL - padR
  const plotH = height - padT - padB
  const band = plotW / Math.max(1, data.length)
  const bw = Math.min(64, band * 0.62)
  const y = (v: number) => padT + plotH - (Math.max(0, v) / top) * plotH
  const ticks = [0, top / 2, top]
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="sbars" role="img" aria-label={label} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={i === 0 ? 0.5 : 0.16} strokeDasharray={i === 0 ? undefined : '3 4'} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".65" fontFamily="Courier Prime, monospace">{format(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = padL + band * i + band / 2
        const h = plotH - (y(d.value) - padT)
        return (
          <g key={d.label + i}>
            <rect className="sbars-bar" x={cx - bw / 2} y={y(d.value)} width={bw} height={Math.max(1, h)} rx="3" fill={color} style={{ animationDelay: `${i * 70}ms` }} />
            <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="Courier Prime, monospace">{format(d.value)}</text>
            <text x={cx} y={height - padB + 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity=".8" fontFamily="Courier Prime, monospace">
              {wrap(d.label).map((l, k) => <tspan key={k} x={cx} dy={k === 0 ? 0 : 13}>{l}</tspan>)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
