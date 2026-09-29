import { Badge, BadgeGroup, Segmented, Switch } from '@nous-research/ui'
import { useState } from 'react'
import run from '../smoke_run.json'
import { Chapter, Note } from './parts'

type View = { position: string; summary: string; weaknesses: string; sources: string[]; disagreement_causes: string[]; confidence_tier: string }

export function Example() {
  const [mode, setMode] = useState<'vanilla' | 'evirag'>('evirag')
  const views = run.views as View[]
  const [showWeak, setShowWeak] = useState(true)
  const [showMeta, setShowMeta] = useState(true)
  return (
    <Chapter
      id="example"
      no="II. A worked example"
      title="Same question, two kinds of answer"
      lead="This is a real saved run of the repository's smoke fixture: two short passages about homework, and a very small local model. It shows the output format. It is not a measure of quality."
      paper
    >
      <div className="q-bar">{run.question}</div>
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Segmented aria-label="Answer style" value={mode} onChange={setMode} options={[{ label: 'Vanilla RAG', value: 'vanilla' }, { label: 'EVIRAG', value: 'evirag' }]} />
        {mode === 'evirag' && (
          <>
            <label className="hw-mono flex items-center gap-3 text-xs uppercase"><Switch checked={showWeak} onCheckedChange={setShowWeak} aria-label="Show weaknesses" /> Weaknesses</label>
            <label className="hw-mono flex items-center gap-3 text-xs uppercase"><Switch checked={showMeta} onCheckedChange={setShowMeta} aria-label="Show sources and causes" /> Sources and causes</label>
          </>
        )}
      </div>

      <div className="mt-8 min-h-[22rem]">
        {mode === 'vanilla' ? (
          <div key="v" className="panel-paper fade-swap">
            <p className="panel-label">One answer</p>
            <p className="hw-mono text-[calc(24*var(--u))] leading-[1.7] normal-case max-md:text-sm">{run.vanilla_answer}</p>
          </div>
        ) : (
          <div key="e" className="grid gap-5 md:grid-cols-3 fade-swap">
            {views.map((v, i) => (
              <article key={v.position} className="panel-paper" style={{ animationDelay: `${i * 120}ms` }}>
                <p className="panel-label">View {i + 1}</p>
                <h3 className="text-[calc(46*var(--u))] leading-[1.05] font-light max-md:text-2xl">{v.position}</h3>
                <p className="hw-mono mt-3 text-[calc(20*var(--u))] leading-[1.6] normal-case max-md:text-xs">{v.summary}</p>
                {showWeak && <p className="hw-mono mt-3 text-[calc(20*var(--u))] leading-[1.6] normal-case opacity-70 max-md:text-xs"><b>Weaknesses.</b> {v.weaknesses}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge type={v.confidence_tier === 'low' ? 'primary' : 'outline'} surface="white">{v.confidence_tier} confidence</Badge>
                  {showMeta && (
                    <BadgeGroup surface="white" type="outline">
                      {v.disagreement_causes.map((c) => <BadgeGroup.Item key={c}>{c}</BadgeGroup.Item>)}
                      {v.sources.map((x) => <BadgeGroup.Item key={x}>{x}</BadgeGroup.Item>)}
                    </BadgeGroup>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Note>
        Each view lists the passages it rests on, the CDA-7 cause of disagreement, and a confidence tier. The saved run produced {run.contradiction_links} contradiction links and classed the case as "{run.controversy_class}". With a model this small the labels are rough, and the third view's summary adds a detail the passages do not contain. That is why the paper scores faithfulness against the cited passages.
      </Note>
    </Chapter>
  )
}
