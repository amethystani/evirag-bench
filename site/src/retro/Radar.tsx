import { useInView } from '../hooks'

const AXES = ['Coverage', 'Contradictions', 'Spread', 'Faithfulness']
const VANILLA = [0.423, 0.572, 0.217, 0.824]
const EVIRAG = [0.847, 0.742, 0.713, 0.891]
const C = 130, R = 100

const pt = (i: number, v: number) => {
  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2
  return [C + Math.cos(a) * R * v, C + Math.sin(a) * R * v]
}
const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ')

export function Radar() {
  const [ref, seen] = useInView<SVGSVGElement>(0.4)
  return (
    <div className="panel">
      <p className="panel-label">Vanilla RAG against EVIRAG</p>
      <svg ref={ref} viewBox="0 0 260 260" className="mx-auto w-full max-w-[26rem]" role="img" aria-label="Radar chart of coverage, contradictions, spread and faithfulness">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} points={poly(AXES.map(() => k))} fill="none" stroke="rgba(255,255,255,.22)" />
        ))}
        {AXES.map((a, i) => {
          const [x, y] = pt(i, 1)
          const [lx, ly] = pt(i, 1.2)
          return (
            <g key={a}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="rgba(255,255,255,.22)" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fill="#fff" fontFamily="Courier Prime, monospace">{a.toUpperCase()}</text>
            </g>
          )
        })}
        <g style={{ transformOrigin: `${C}px ${C}px`, transform: seen ? 'scale(1)' : 'scale(0)', transition: 'transform 1.3s cubic-bezier(.2,.8,.2,1)' }}>
          <polygon points={poly(VANILLA)} fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth="1.6" />
        </g>
        <g style={{ transformOrigin: `${C}px ${C}px`, transform: seen ? 'scale(1)' : 'scale(0)', transition: 'transform 1.5s cubic-bezier(.2,.8,.2,1) .25s' }}>
          <polygon points={poly(EVIRAG)} fill="rgba(237,255,69,.22)" stroke="#edff45" strokeWidth="2" />
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-5 hw-mono text-xs uppercase">
        <span><i className="dot" style={{ background: '#fff' }} /> Vanilla RAG</span>
        <span><i className="dot" style={{ background: '#edff45' }} /> EVIRAG</span>
      </div>
      <p className="hw-mono mt-3 text-center text-[11px] normal-case opacity-70">Spread is one minus single-view concentration. Values from the paper's main results table.</p>
    </div>
  )
}
