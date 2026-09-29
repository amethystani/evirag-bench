import { useMemo, useState } from 'react'
import { claims, edges } from './data'

const W = 560, H = 360
const DOC_COLORS = ['#7fb0ff', '#ff9fb2', '#9df0b5']

/** Claim graph: nodes are claims (coloured by source document), green links support, red dashed links contradict. */
export function ClaimGraph({ compact = false }: { compact?: boolean }) {
  const [hot, setHot] = useState<string | null>(null)
  const docs = [...new Set(claims.map((c) => c.doc_id))]
  const pos = useMemo(() => {
    const p: Record<string, [number, number]> = {}
    docs.forEach((d, di) => {
      const group = claims.filter((c) => c.doc_id === d)
      group.forEach((c, i) => {
        const a = (Math.PI * 2 * i) / group.length - Math.PI / 2
        const cx = W * ((di + 1) / (docs.length + 1))
        p[c.id] = [cx + Math.cos(a) * 68, H / 2 + Math.sin(a) * 105]
      })
    })
    return p
  }, [docs.length])
  const near = (id: string) => hot === id || edges.some((e) => (e.source === hot && e.target === id) || (e.target === hot && e.source === id))
  const hotClaim = claims.find((c) => c.id === hot)
  return (
    <div className="cg">
      <svg viewBox={`0 0 ${W} ${H}`} className="cg-svg" role="img" aria-label="Claim graph with support and contradiction links">
        {docs.map((d, di) => (
          <text key={d} x={W * ((di + 1) / (docs.length + 1))} y={18} textAnchor="middle" fontSize="12" fill="#fff" opacity=".75" fontFamily="Courier Prime, monospace">{d}</text>
        ))}
        {edges.map((e, i) => {
          const [x1, y1] = pos[e.source], [x2, y2] = pos[e.target]
          const on = !hot || e.source === hot || e.target === hot
          const con = e.label === 'contradicts'
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={con ? '#ff6b6b' : '#7ee2a0'} strokeWidth={con ? 2.4 : 1.8} strokeDasharray={con ? '6 5' : undefined} opacity={on ? 0.95 : 0.1} style={{ transition: 'opacity .25s' }} />
        })}
        {claims.map((c) => {
          const [x, y] = pos[c.id]
          return (
            <g key={c.id} onMouseEnter={() => setHot(c.id)} onMouseLeave={() => setHot(null)} opacity={!hot || near(c.id) ? 1 : 0.25} style={{ cursor: 'pointer', transition: 'opacity .25s' }}>
              <circle cx={x} cy={y} r={16} fill={DOC_COLORS[docs.indexOf(c.doc_id) % 3]} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#0a0a3d" fontWeight="700" fontFamily="Courier Prime, monospace">{c.id}</text>
            </g>
          )
        })}
      </svg>
      <div className="cg-legend">
        <span><i style={{ background: '#7ee2a0' }} /> supports</span>
        <span><i style={{ background: '#ff6b6b' }} /> contradicts</span>
        {docs.map((d, i) => <span key={d}><b style={{ background: DOC_COLORS[i % 3] }} /> {d}</span>)}
      </div>
      <p className="cg-read">{hotClaim ? `${hotClaim.id}: ${hotClaim.text}` : compact ? 'Hover a claim to read it.' : 'Hover a claim to read it and isolate its links.'}</p>
    </div>
  )
}
