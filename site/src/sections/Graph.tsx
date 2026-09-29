import { useAutoStep } from '../hooks'
import { Chapter } from './parts'

// Two communities of claims. Green edges support, red edges contradict.
const N: [string, number, number, number][] = [
  ['a', 90, 70, 0], ['b', 170, 150, 0], ['c', 80, 210, 0], ['d', 40, 130, 0],
  ['e', 420, 60, 1], ['f', 350, 140, 1], ['g', 440, 200, 1], ['h', 300, 230, 1]
]
const SUP: [string, string][] = [['a', 'b'], ['b', 'c'], ['a', 'd'], ['c', 'd'], ['e', 'f'], ['f', 'g'], ['f', 'h'], ['g', 'h']]
const CON: [string, string][] = [['b', 'f'], ['a', 'e'], ['c', 'h']]
const pos = (id: string) => N.find((n) => n[0] === id)!
const PHASES = [
  ['Claims', 'Each passage is split into atomic claims. Every dot is one checkable statement with a known source.'],
  ['Links', 'Pairs of claims are labelled. Solid lines mean support. Dashed lines mean contradiction, each with a CDA-7 cause.'],
  ['Communities', 'Signed Louvain finds groups that support within and contradict across. The number of groups is set by the data.'],
  ['Views', 'Each group is written up as one view, with its own evidence, weaknesses, sources and confidence.']
]

export function Graph() {
  const { ref, step, pick } = useAutoStep(PHASES.length, 3800)
  return (
    <Chapter
      id="graph"
      no="VI. The claim graph"
      title="Positions are groups of claims"
      lead="A position is not a single quote. EVIRAG finds positions by partitioning a signed graph: claims that support each other end up together, and contradiction lines run between the groups."
    >
      <div ref={ref} className="grid gap-[calc(70*var(--u))] md:grid-cols-[1.3fr_1fr] max-md:gap-8">
        <div className="panel">
          <svg viewBox="-30 0 560 280" className="w-full" role="img" aria-label="Claim graph with two communities">
            <g style={{ opacity: step >= 2 ? 1 : 0, transition: 'opacity .8s' }}>
              <ellipse cx="90" cy="140" rx="100" ry="105" fill="#edff45" opacity=".14" stroke="#edff45" strokeDasharray="5 6" />
              <ellipse cx="380" cy="150" rx="105" ry="100" fill="#ff9fb2" opacity=".14" stroke="#ff9fb2" strokeDasharray="5 6" />
            </g>
            {SUP.map(([p, q], i) => {
              const a = pos(p), b = pos(q)
              return <line key={p + q} x1={a[1]} y1={a[2]} x2={b[1]} y2={b[2]} stroke="#9df0b5" strokeWidth="2"
                style={{ opacity: step >= 1 ? 1 : 0, transition: `opacity .6s ${i * 60}ms` }} />
            })}
            {CON.map(([p, q], i) => {
              const a = pos(p), b = pos(q)
              return <line key={p + q} x1={a[1]} y1={a[2]} x2={b[1]} y2={b[2]} stroke="#ff6b6b" strokeWidth="2.5" strokeDasharray="7 6"
                style={{ opacity: step >= 1 ? 1 : 0, transition: `opacity .6s ${0.4 + i * 120}ms` }} />
            })}
            {N.map(([id, x, y, g], i) => (
              <circle key={id} cx={x} cy={y} r="13" fill={step >= 2 ? (g === 0 ? '#edff45' : '#ff9fb2') : '#fff'}
                style={{ transition: `fill .7s, transform .6s ${i * 50}ms`, transformOrigin: `${x}px ${y}px`, transform: step >= 0 ? 'scale(1)' : 'scale(0)' }} />
            ))}
            <g style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity .8s' }}>
              <text x="90" y="272" textAnchor="middle" fill="#fff" fontFamily="Courier Prime, monospace" fontSize="14">VIEW A</text>
              <text x="380" y="272" textAnchor="middle" fill="#fff" fontFamily="Courier Prime, monospace" fontSize="14">VIEW B</text>
            </g>
          </svg>
        </div>
        <div>
          <ol className="flex flex-col gap-2">
            {PHASES.map(([t, d], i) => (
              <li key={t}>
                <button className={`step-btn ${i === step ? 'step-on' : ''}`} onClick={() => pick(i)}>
                  <span className="hw-mono text-xs opacity-70">Step {i + 1}</span>
                  <span className="text-[calc(50*var(--u))] leading-none font-light uppercase max-md:text-2xl">{t}</span>
                  {i === step && <span className="hw-mono mt-2 block text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">{d}</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Chapter>
  )
}
