import { BarChart } from '@nous-research/ui/ui/components/graphs/index'
import { Reveal, useInView } from '../hooks'
import { Chapter, Note } from './parts'
import { Radar } from '../retro/Radar'

const ROWS: [string, number, number, number, string][] = [
  ['Closed-book, no retrieval', 0.392, 0.214, 1, '#9aa7d6'],
  ['Vanilla RAG, 10 passages', 0.423, 0.572, 1, '#ffffff'],
  ['Vanilla RAG, 15 passages', 0.521, 0.612, 1, '#ffffff'],
  ['One structured prompt, 15 passages', 0.736, 0.613, 1, '#ffe08a'],
  ['EVIRAG without the graph', 0.512, 0.604, 5, '#9fd8ff'],
  ['EVIRAG full', 0.847, 0.742, 14, '#edff45']
]

function Row({ label, vc, cr, calls, color, i }: { label: string; vc: number; cr: number; calls: number; color: string; i: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  return (
    <div ref={ref} className="res-row">
      <span className="hw-mono text-[calc(21*var(--u))] uppercase max-md:text-xs">{label}</span>
      <span className="bar-track"><i style={{ width: seen ? `${vc * 100}%` : '0%', background: color, transitionDelay: `${i * 80}ms` }} /></span>
      <span className="hw-mono num">{vc.toFixed(3)}</span>
      <span className="bar-track"><i style={{ width: seen ? `${cr * 100}%` : '0%', background: color, transitionDelay: `${i * 80 + 150}ms` }} /></span>
      <span className="hw-mono num">{cr.toFixed(3)}</span>
      <span className="hw-mono num opacity-70">{calls}×</span>
    </div>
  )
}

export function Results() {
  return (
    <Chapter
      id="results"
      no="X. What the paper found"
      title="Prompting gets coverage. The graph gets contradictions."
      lead="These are the numbers reported in the paper, run with a 35B open model on the full benchmark and on a 250-query subset for the controls. They are not produced by the smoke fixture in this repository."
    >
      <div className="panel">
        <div className="res-head hw-mono">
          <span />
          <span className="col-span-2">Viewpoint coverage</span>
          <span className="col-span-2">Contradiction recall</span>
          <span>LLM calls</span>
        </div>
        {ROWS.map(([l, vc, cr, calls, c], i) => <Row key={l} label={l} vc={vc} cr={cr} calls={calls} color={c} i={i} />)}
      </div>

      <div className="mt-[calc(70*var(--u))] grid gap-5 md:grid-cols-2 max-md:mt-10">
        <Radar />
        <div className="panel">
          <p className="panel-label">Contradiction recall by system</p>
          <BarChart
            height={300}
            data={ROWS.map(([label, , cr]) => ({ label: label.replace('EVIRAG ', '').replace('Vanilla RAG, ', 'Vanilla ').replace('One structured prompt, 15 passages', 'Prompt, 15').replace('Closed-book, no retrieval', 'Closed-book'), cr }))}
            x="label"
            y="cr"
            yDomain={[0, 1]}
            formatY={(v) => v.toFixed(1)}
            formatTooltip={(d) => `${String(d.label)}: ${Number(d.cr).toFixed(3)}`}
          />
        </div>
      </div>

      <div className="mt-[calc(90*var(--u))] grid gap-5 md:grid-cols-3 max-md:mt-10">
        {[
          ['Coverage is mostly promptable', 'One prompt asking for competing views, over the same 15 passages, closes about three quarters of the coverage gap. That gain should not be credited to architecture.'],
          ['Contradictions need comparison', 'The same prompt adds almost nothing to contradiction recall over the budget-matched control (0.613 against 0.612). A pair can only be recovered if its two claims were compared, and that is what pairwise labelling does.'],
          ['The gain comes with a cost', 'Full EVIRAG uses about 14 generation calls per query against 1 for the single-call systems. A call-matched control has not been run, and the paper says so.']
        ].map(([t, b], i) => (
          <Reveal key={t} delay={i * 110}>
            <div className="panel h-full">
              <h3 className="text-[calc(50*var(--u))] leading-[1.05] font-light uppercase max-md:text-2xl">{t}</h3>
              <p className="hw-mono mt-3 text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Note>Read with care: the benchmark, the metrics and the system share authors, which the paper treats as its most serious threat and tests directly. Faithfulness stays high for EVIRAG (0.891), second only to a citation-focused baseline. Confidence-calibration error is not comparable across systems, because only EVIRAG emits a confidence tier. Full tables, per-domain results, ablations and human evaluation are in the paper.</Note>
    </Chapter>
  )
}
