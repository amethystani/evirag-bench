import { useInView } from '../hooks'
import { Chapter, Note } from './parts'

const VIEWS = [
  { id: 'V1', x: 90, y: 60, label: 'Helps', c: '#edff45' },
  { id: 'V2', x: 60, y: 150, label: 'No clear effect', c: '#ffffff' },
  { id: 'V3', x: 100, y: 240, label: 'Depends on who', c: '#ff9fb2' }
]

function Diagram({ collapse }: { collapse: boolean }) {
  const [ref, seen] = useInView<SVGSVGElement>(0.35)
  const go = seen
  return (
    <svg ref={ref} viewBox="0 0 520 300" className="w-full" role="img"
      aria-label={collapse ? 'Three viewpoints are averaged into one answer' : 'Three viewpoints are kept as three answers'}>
      {VIEWS.map((v, i) => (
        <g key={v.id} style={{
          transform: `translate(${go && collapse ? 250 - v.x : 0}px, ${go && collapse ? 150 - v.y : 0}px)`,
          transition: `transform 1.4s cubic-bezier(.6,0,.2,1) ${i * 120}ms`
        }}>
          <circle cx={v.x} cy={v.y} r="22" fill={v.c} opacity=".92" />
          <text x={v.x} y={v.y + 5} textAnchor="middle" fontSize="14" fontFamily="Courier Prime, monospace" fill="#0000f2" fontWeight="700">{v.id}</text>
        </g>
      ))}
      {collapse ? (
        <g style={{ opacity: go ? 1 : 0, transition: 'opacity .8s ease 1.3s' }}>
          <line x1="272" y1="150" x2="380" y2="150" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" />
          <rect x="380" y="112" width="130" height="76" rx="8" fill="none" stroke="#fff" strokeWidth="2" />
          <text x="445" y="146" textAnchor="middle" fontSize="15" fill="#fff" fontFamily="Courier Prime, monospace">one fluent</text>
          <text x="445" y="168" textAnchor="middle" fontSize="15" fill="#fff" fontFamily="Courier Prime, monospace">answer</text>
        </g>
      ) : (
        VIEWS.map((v, i) => (
          <g key={v.id} style={{ opacity: go ? 1 : 0, transition: `opacity .7s ease ${0.5 + i * 0.25}s` }}>
            <line x1={v.x + 24} y1={v.y} x2="330" y2={v.y} stroke="#fff" strokeWidth="1.5" strokeDasharray="4 6" />
            <rect x="330" y={v.y - 26} width="180" height="52" rx="8" fill="none" stroke={v.c} strokeWidth="2" />
            <text x="420" y={v.y + 5} textAnchor="middle" fontSize="14" fill="#fff" fontFamily="Courier Prime, monospace">{v.label}</text>
          </g>
        ))
      )}
    </svg>
  )
}

export function Problem() {
  return (
    <Chapter
      id="problem"
      no="I. The problem"
      title="One fluent answer hides the argument"
      lead="Ask a scientific question that researchers genuinely disagree about, and a standard RAG system returns one confident paragraph. The paragraph can be well written and fully grounded in sources, and still erase the fact that the literature is split."
    >
      <div className="grid gap-[calc(60*var(--u))] md:grid-cols-2 max-md:gap-10">
        <div className="panel">
          <p className="panel-label">Standard RAG</p>
          <Diagram collapse />
          <p className="hw-mono mt-4 text-[calc(22*var(--u))] normal-case max-md:text-xs">Three distinct positions are compressed toward a single consensus. The disagreement cannot be recovered afterwards.</p>
        </div>
        <div className="panel">
          <p className="panel-label">EVIRAG</p>
          <Diagram collapse={false} />
          <p className="hw-mono mt-4 text-[calc(22*var(--u))] normal-case max-md:text-xs">Each position stays a separate view, with its own evidence, weaknesses, sources and confidence.</p>
        </div>
      </div>

      <div className="mt-[calc(110*var(--u))] grid gap-[calc(50*var(--u))] md:grid-cols-3 max-md:mt-14 max-md:gap-8">
        {[
          ['Epistemic collapse', 'Turning structured, multi-view evidence into one response. The term is used here as a technical name for that failure.'],
          ['Not every question', 'Lookup questions want one answer. The claim is narrower: questions with persistent scientific disagreement need an output that keeps viewpoints, provenance and uncertainty.'],
          ['Retrieval alone is not enough', 'Fetching more diverse documents does not help if the synthesis step still squeezes them into one paragraph.']
        ].map(([t, b], i) => (
          <div key={t} className="reveal-card" style={{ transitionDelay: `${i * 110}ms` }}>
            <h3 className="text-[calc(54*var(--u))] leading-none font-light uppercase max-md:text-3xl">{t}</h3>
            <p className="hw-mono mt-4 text-[calc(22*var(--u))] leading-[1.6] normal-case opacity-85 max-md:text-xs">{b}</p>
          </div>
        ))}
      </div>
      <Note>Examples of questions where this matters: whether homework improves achievement, whether statins help in primary prevention, whether raising the minimum wage reduces employment.</Note>
    </Chapter>
  )
}
