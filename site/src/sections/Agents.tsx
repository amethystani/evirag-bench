import { Reveal } from '../hooks'
import { Chapter, Note } from './parts'

const AGENTS = [
  { name: 'Precision', n: 3, goal: 'High-confidence passages that support the main reading.', tone: '#edff45' },
  { name: 'Recall', n: 5, goal: 'Broad coverage of the corpus, so nothing relevant is missed.', tone: '#ffffff' },
  { name: 'Skeptic', n: 4, goal: 'Passages that challenge, contradict or qualify the dominant view: dissent, null results, critiques.', tone: '#ff9fb2' },
  { name: 'Counterfactual', n: 3, goal: 'Alternative framings and minority positions.', tone: '#9fd8ff' }
]

export function Agents() {
  return (
    <Chapter
      id="agents"
      no="IV. Retrieval"
      title="Four agents, four different jobs"
      lead="Ordinary retrieval is drawn toward whatever most documents agree on. Giving each agent an opposing objective breaks that pull. The Skeptic is the only one whose goal is explicitly anti-consensus."
    >
      <div className="grid gap-5 md:grid-cols-4">
        {AGENTS.map((a, i) => (
          <Reveal key={a.name} delay={i * 110}>
            <div className="panel h-full">
              <p className="panel-label">Agent {i + 1}</p>
              <h3 className="text-[calc(68*var(--u))] leading-none font-light uppercase max-md:text-3xl">{a.name}</h3>
              <div className="pips mt-5" aria-label={`${a.n} passages`}>
                {Array.from({ length: a.n }).map((_, k) => (
                  <i key={k} style={{ background: a.tone, animationDelay: `${0.4 + k * 0.12}s` }} />
                ))}
              </div>
              <p className="hw-mono mt-2 text-xs uppercase opacity-70">{a.n} passages</p>
              <p className="hw-mono mt-4 text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">{a.goal}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Note>Budgets are 3, 5, 4 and 3 passages, up to 15 in total. Simple, resolved questions skip this and use a concise source-grounded answer instead.</Note>
    </Chapter>
  )
}
