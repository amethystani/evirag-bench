import { Reveal } from '../hooks'
import { Chapter, Note } from './parts'

const M = [
  ['ViewpointCoverage', 'higher is better', 'What fraction of the annotated viewpoints show up in the response, matched by sentence-embedding similarity at a 0.65 threshold.'],
  ['ContradictionRecall', 'higher is better', 'What fraction of the annotated contradicting claim pairs the system recovers. It only counts if the two claims were actually compared.'],
  ['Single-View Concentration', 'lower is better', 'How unevenly the response spreads its claims across the gold views. 1 means everything sits on one view. 0 means an even spread.'],
  ['Faithfulness', 'higher is better', 'What fraction of the response’s claims are supported by the passages it cites.'],
  ['Confidence Calibration Error', 'lower is better', 'How far the emitted confidence tier is from the gold controversy class. Only defined for systems that emit a confidence signal.'],
  ['EpistemicCoverage@K', 'diagnostic', 'What fraction of gold viewpoints appear in the top-K retrieved passages. It shows whether a failure began before synthesis.']
]

export function Metrics() {
  return (
    <Chapter
      id="metrics"
      no="IX. Measuring it"
      title="What good looks like"
      lead="Six measures, each answering a different question about a response. Every comparison uses bootstrap intervals and paired Wilcoxon tests with Bonferroni correction."
      paper
    >
      <div className="grid gap-5 md:grid-cols-3">
        {M.map(([n, dir, d], i) => (
          <Reveal key={n} delay={(i % 3) * 100}>
            <div className="panel-paper h-full">
              <p className="panel-label">{dir}</p>
              <h3 className="text-[calc(50*var(--u))] leading-[1.05] font-light uppercase max-md:text-2xl">{n}</h3>
              <p className="hw-mono mt-3 text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Note>A negative result worth knowing: a reference-free "consensus collapse" score that seemed natural turned out to be direction-invalid. It rises as views become more diverse, ordering 0 of 8 gold instances correctly. That is why concentration is scored against a gold reference.</Note>
    </Chapter>
  )
}
