import { Progress, Stats } from '@nous-research/ui'
import { CountUp, Reveal, useInView } from '../hooks'
import { useEffect, useState } from 'react'
import { Chapter, Note } from './parts'

function Bar({ label, value, max, delay = 0 }: { label: string; value: number; max: number; color?: string; suffix?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  const [go, setGo] = useState(false)
  useEffect(() => { if (!seen) return; const id = setTimeout(() => setGo(true), delay); return () => clearTimeout(id) }, [seen, delay])
  return (
    <div ref={ref} className="bar-row2">
      <span className="hw-mono text-[calc(21*var(--u))] uppercase max-md:text-xs">{label}</span>
      <Progress aria-label={label} value={go ? Math.round((value / max) * 100) : 0} />
      <span className="hw-mono text-[calc(21*var(--u))] max-md:text-xs">{value.toLocaleString('en-US')}</span>
    </div>
  )
}

const FACTS: [number, string][] = [[989, 'Peer-reviewed papers'], [43155, 'Passage chunks'], [63955, 'Atomic claims'], [1250, 'Gold queries']]

export function Bench() {
  return (
    <Chapter
      id="benchmark"
      no="VIII. The benchmark"
      title="1,250 questions where scientists disagree"
      lead="Ordinary retrieval benchmarks reward relevance to a single answer. EVIRAG-Bench measures whether a system keeps the real spread of views, so every query carries four layers of annotation written before any system was run."
    >
      <div className="grid grid-cols-2 gap-[calc(40*var(--u))] md:grid-cols-4">
        {FACTS.map(([n, l], i) => (
          <Reveal key={l} delay={i * 90}>
            <div className="text-[calc(130*var(--u))] leading-none font-light max-md:text-5xl"><CountUp to={n} /></div>
            <p className="hw-mono mt-3 text-[calc(20*var(--u))] uppercase max-md:text-xs">{l}</p>
          </Reveal>
        ))}
      </div>

      <div className="mt-[calc(90*var(--u))] max-md:mt-10">
        <Stats items={[{ label: 'Viewpoints per query', value: '2 to 4' }, { label: 'Contradiction pairs per query', value: '1 to 8' }, { label: 'Annotators per domain', value: 'Authors + 1 external' }, { label: 'Viewpoint agreement (κ)', value: '0.71' }]} />
      </div>

      <div className="mt-[calc(110*var(--u))] grid gap-[calc(70*var(--u))] md:grid-cols-2 max-md:mt-12 max-md:gap-10">
        <div className="panel">
          <p className="panel-label">By controversy class</p>
          <Bar label="Resolved" value={190} max={445} color="#9df0b5" />
          <Bar label="Emerging" value={335} max={445} color="#ffe08a" delay={100} />
          <Bar label="Stable" value={445} max={445} color="#9fd8ff" delay={200} />
          <Bar label="Polarized" value={280} max={445} color="#ff9fb2" delay={300} />
        </div>
        <div className="panel">
          <p className="panel-label">By domain (250 queries each)</p>
          {['Education', 'Biomedicine', 'Economics', 'Earth sciences', 'Nutrition'].map((d, i) => (
            <Bar key={d} label={d} value={250} max={250} color="#fff" delay={i * 90} />
          ))}
        </div>
      </div>

      <div className="mt-[calc(110*var(--u))] grid gap-5 md:grid-cols-4 max-md:mt-12">
        {[
          ['Viewpoints', '2 to 4 ground-truth positions per query, each with its source passages.'],
          ['Contradictions', '1 to 8 annotated pairs of claims that cannot both hold.'],
          ['CDA-7 cause', 'One disagreement cause per contradicting pair.'],
          ['Controversy class', 'Resolved, emerging, stable or polarized.']
        ].map(([t, b], i) => (
          <Reveal key={t} delay={i * 100}>
            <div className="panel h-full">
              <p className="panel-label">Layer {i + 1}</p>
              <h3 className="text-[calc(50*var(--u))] leading-none font-light uppercase max-md:text-2xl">{t}</h3>
              <p className="hw-mono mt-3 text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Note>The five domains are education (homework), biomedicine (statins in primary prevention), economics (minimum wage), earth sciences (climate feedbacks) and nutrition (dietary fat and cardiovascular risk). Annotation was done by the authors with an external domain consultant per domain, and the gold file was version-locked before any run. Agreement on a 200-query re-annotation: Cohen's κ 0.71 for viewpoints and 0.68 for CDA-7 labels.</Note>
    </Chapter>
  )
}
