import { useAutoStep } from '../hooks'
import { Chapter } from './parts'

const STEPS = [
  { name: 'Intent', tag: 'Stage 1', plain: 'Decide whether the question is settled or contested.',
    detail: 'A resolved question gets a short, source-grounded answer. A contested one triggers the full pipeline and a larger retrieval budget.',
    out: 'resolved | contested' },
  { name: 'Retrieve', tag: 'Stage 2', plain: 'Send four agents with different goals to the corpus.',
    detail: 'Precision, Recall, Skeptic and Counterfactual each rewrite the query for their own objective. Their passages are merged and de-duplicated into one pool of up to 15.',
    out: 'passages with document, section and year' },
  { name: 'Claims', tag: 'Stage 3', plain: 'Break passages into atomic claims and link them.',
    detail: 'Each claim is one checkable statement tied to its passage. Claim pairs are labelled support, contradict or neutral, forming a signed graph.',
    out: 'claims + signed edges' },
  { name: 'Causes', tag: 'Stage 4', plain: 'Explain why each contradiction exists.',
    detail: 'Every contradicting pair gets one of seven CDA-7 causes, such as different populations or different study designs.',
    out: 'a CDA-7 label per contradiction' },
  { name: 'Time', tag: 'Stage 5', plain: 'Count evidence per year.',
    detail: 'Claims and contradiction links are tallied by publication year, showing whether a dispute is new, stable or settling.',
    out: 'temporal curve' },
  { name: 'Views', tag: 'Stage 6', plain: 'Split the graph into positions and write each one up.',
    detail: 'Signed Louvain groups claims that agree with each other and disagree with other groups. Each group becomes one view with a position, evidence, weaknesses and sources.',
    out: 'k views (k set by the graph)' },
  { name: 'Confidence', tag: 'Stage 7', plain: 'Label how much to trust each view.',
    detail: 'Confidence comes from claim agreement, source diversity, contradiction severity, CDA-7 priors and the temporal trend. It never comes from how fluent the prose is.',
    out: 'high | medium | low per view' }
]

export function Pipeline() {
  const { ref, step, pick } = useAutoStep(STEPS.length, 4200)
  const s = STEPS[step]
  return (
    <Chapter
      id="pipeline-detail"
      no="III. How it works"
      title="Model the disagreement before writing anything"
      lead="The design rule is simple: once evidence has been collapsed into a paragraph, the structure cannot be recovered. So EVIRAG builds the structure first, then writes."
    >
      <div ref={ref} className="grid gap-[calc(70*var(--u))] md:grid-cols-[1fr_1.4fr] max-md:gap-8">
        <ol className="flex flex-col">
          {STEPS.map((st, i) => (
            <li key={st.name}>
              <button onClick={() => pick(i)} className={`step-btn ${i === step ? 'step-on' : ''}`}>
                <span className="hw-mono text-xs opacity-70">{st.tag}</span>
                <span className="text-[calc(58*var(--u))] leading-none font-light uppercase max-md:text-3xl">{st.name}</span>
                <span className="step-bar"><i key={`${step}-${i === step}`} style={i === step ? { animation: 'stepbar 4.2s linear forwards' } : undefined} /></span>
              </button>
            </li>
          ))}
        </ol>
        <div key={step} className="panel fade-swap self-start">
          <p className="panel-label">{s.tag}</p>
          <h3 className="text-[calc(84*var(--u))] leading-none font-light uppercase max-md:text-4xl">{s.name}</h3>
          <p className="mt-5 text-[calc(46*var(--u))] leading-[1.2] font-light max-md:text-xl">{s.plain}</p>
          <p className="hw-mono mt-5 text-[calc(24*var(--u))] leading-[1.7] normal-case opacity-90 max-md:text-sm">{s.detail}</p>
          <p className="hw-mono mt-6 text-[calc(20*var(--u))] uppercase max-md:text-xs">Produces: <span className="chip">{s.out}</span></p>
        </div>
      </div>
    </Chapter>
  )
}
