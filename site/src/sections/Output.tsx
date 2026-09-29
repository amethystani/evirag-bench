import { useInView } from '../hooks'
import { Chapter, Note } from './parts'

const LINES = [
  '{',
  '  "question": "Does homework improve academic achievement?",',
  '  "controversy_class": "polarized",',
  '  "views": [{',
  '    "position": "…one checkable position…",',
  '    "summary": "…evidence with passage citations…",',
  '    "weaknesses": "…limits of the evidence…",',
  '    "disagreement_causes": ["methodological"],',
  '    "sources": ["edu_a:0:0", "edu_b:0:0"],',
  '    "confidence_tier": "low"',
  '  }],',
  '  "claims": [ … ],  "edges": [ … ],',
  '  "temporal_curve": { "2006": [5, 6], "2015": [3, 6] }',
  '}'
]

export function Output() {
  const [ref, seen] = useInView<HTMLPreElement>(0.3)
  return (
    <Chapter
      id="output"
      no="XI. What you get back"
      title="An answer you can check"
      lead="Every run writes one JSON record. Each view carries its own provenance, and every source ID resolves to a retrieved passage, so a reader can go from a statement straight to the text it came from."
      paper
    >
      <div className="grid gap-[calc(70*var(--u))] md:grid-cols-[1.2fr_1fr] max-md:gap-8">
        <pre ref={ref} className="code">
          {LINES.map((l, i) => (
            <span key={i} className="code-line" style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateX(-12px)', transitionDelay: `${i * 110}ms` }}>{l}{'\n'}</span>
          ))}
        </pre>
        <ul className="hw-mono flex flex-col gap-4 text-[calc(23*var(--u))] leading-[1.6] normal-case max-md:text-sm">
          <li><b>Position.</b> One checkable claim per view.</li>
          <li><b>Weaknesses.</b> Stated up front, not buried.</li>
          <li><b>Disagreement causes.</b> Why this view conflicts with the others.</li>
          <li><b>Sources.</b> Passage IDs that resolve in the record.</li>
          <li><b>Confidence tier.</b> Set by the evidence structure, not the prose.</li>
          <li><b>Temporal curve.</b> Claims and contradictions per year.</li>
        </ul>
      </div>
      <Note>The same record also stores atomic claims, graph edges, retrieved passages, model names and a readable answer template. The layout is documented in docs/output.md.</Note>
    </Chapter>
  )
}
