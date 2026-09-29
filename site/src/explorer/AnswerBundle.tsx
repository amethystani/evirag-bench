import { Badge, BadgeGroup, Progress, Segmented } from '@nous-research/ui'
import { BarChart } from '@nous-research/ui/ui/components/graphs/index'
import { useState } from 'react'
import compare from '../answer_compare.json'
import { chunks, claims, contradictions, curve, edges, meta, supports, views } from './data'
import { ClaimGraph } from './ClaimGraph'

type Tab = 'answer' | 'graph' | 'conflicts' | 'diff' | 'sources' | 'time'
const claimById = (id: string) => claims.find((c) => c.id === id)!
const tierPct = (t: string) => (t === 'high' ? 90 : t === 'medium' ? 55 : 25)

function AnswerTab() {
  return (
    <div className="ab-stack">
      {views.map((v, i) => (
        <article key={v.position} className="ab-card">
          <div className="ab-card-head">
            <span className="ab-no">View {i + 1}</span>
            <BadgeGroup surface="blue" type="outline">
              <BadgeGroup.Item>{v.confidence_tier} confidence</BadgeGroup.Item>
              {v.disagreement_causes.map((c) => <BadgeGroup.Item key={c}>{c}</BadgeGroup.Item>)}
            </BadgeGroup>
          </div>
          <h4>{v.position}</h4>
          <p className="ab-p">{v.summary}</p>
          <p className="ab-p ab-dim"><b>Weaknesses.</b> {v.weaknesses}</p>
          <Progress aria-label={`${v.confidence_tier} confidence`} value={tierPct(v.confidence_tier)} />
          <p className="ab-src">Sources: {v.sources.map((s) => <code key={s}>{s}</code>)}</p>
        </article>
      ))}
    </div>
  )
}

function ConflictsTab() {
  return (
    <div className="ab-stack">
      <p className="ab-p ab-dim">{contradictions.length} contradiction links. Each pair of claims cannot both hold, and each carries a CDA-7 cause.</p>
      {contradictions.map((e, i) => {
        const a = claimById(e.source), b = claimById(e.target)
        return (
          <article key={i} className="ab-card ab-conflict">
            <div className="ab-side"><span className="ab-id">{a.id} · {a.doc_id} · {a.year}</span><p>{a.text}</p></div>
            <span className="ab-vs" aria-hidden>✕</span>
            <div className="ab-side"><span className="ab-id">{b.id} · {b.doc_id} · {b.year}</span><p>{b.text}</p></div>
            <Badge type="outline" surface="blue">{e.cda7 ?? 'unlabelled'}</Badge>
          </article>
        )
      })}
    </div>
  )
}

function DiffTab() {
  const cr = compare.cr as { full: number; vanilla: number; structured: number }
  return (
    <div className="ab-stack">
      <div className="ab-diff">
        <section className="ab-card">
          <p className="ab-no">Vanilla RAG</p>
          <p className="ab-p">{compare.vanilla}</p>
          <ul className="ab-facts"><li><b>1</b> answer</li><li><b>0</b> contradictions shown</li><li>Contradiction recall <b>{cr.vanilla.toFixed(1)}</b></li></ul>
        </section>
        <section className="ab-card ab-card-hot">
          <p className="ab-no">EVIRAG</p>
          <ol className="ab-mini">{views.map((v) => <li key={v.position}>{v.position}</li>)}</ol>
          <ul className="ab-facts"><li><b>{views.length}</b> views</li><li><b>{contradictions.length}</b> contradictions, each with a cause</li><li>Contradiction recall <b>{cr.full.toFixed(1)}</b></li></ul>
        </section>
      </div>
      <section className="ab-card">
        <p className="ab-no">Structured prompt (one call, no graph)</p>
        <p className="ab-p">{compare.structured}</p>
        <p className="ab-p ab-dim">Contradiction recall {cr.structured.toFixed(1)}. On this one query a strong prompt also names both sides, so this run does not show the graph beating it. The paper's full benchmark is where that comparison is made.</p>
      </section>
      <p className="ab-p ab-dim">From the preliminary check on the saved run ({compare.model}). One query, a small model: it shows the mechanism, not benchmark quality.</p>
    </div>
  )
}

function SourcesTab() {
  return (
    <div className="ab-stack">
      {chunks.map((c) => (
        <article key={c.id} className="ab-card">
          <div className="ab-card-head"><span className="ab-no">{c.id}</span><span className="ab-id">{c.title} · {c.year}</span></div>
          <p className="ab-p">{c.text}</p>
        </article>
      ))}
    </div>
  )
}

function TimeTab() {
  return (
    <div className="ab-grid2">
      <div>
        <p className="ab-no">Claims per year</p>
        <BarChart height={200} data={curve.map(([y, v]) => ({ year: y, n: v[0] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} claims`} />
      </div>
      <div>
        <p className="ab-no">Contradiction links per year</p>
        <BarChart height={200} data={curve.map(([y, v]) => ({ year: y, n: v[1] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} links`} />
      </div>
    </div>
  )
}

export function AnswerBundle({ matched }: { matched: boolean }) {
  const [tab, setTab] = useState<Tab>('answer')
  return (
    <div className="ab">
      <div className="ab-summary">
        <div><b>{meta.cls}</b><span>controversy class</span></div>
        <div><b>{views.length}</b><span>views</span></div>
        <div><b>{claims.length}</b><span>claims</span></div>
        <div><b>{supports.length}</b><span>support links</span></div>
        <div><b>{contradictions.length}</b><span>contradictions</span></div>
      </div>
      {!matched && <p className="ab-note">Live answers for new questions will go live later. This is the saved run, which answers “{meta.question}”.</p>}
      <div className="ab-tabs">
        <Segmented aria-label="Answer sections" size="sm" value={tab} onChange={setTab} options={[
          { label: 'Answer', value: 'answer' }, { label: 'Graph', value: 'graph' }, { label: 'Contradictions', value: 'conflicts' },
          { label: 'Vs vanilla', value: 'diff' }, { label: 'Sources', value: 'sources' }, { label: 'Time', value: 'time' }
        ]} />
      </div>
      <div key={tab} className="ab-panel">
        {tab === 'answer' && <AnswerTab />}
        {tab === 'graph' && <ClaimGraph />}
        {tab === 'conflicts' && <ConflictsTab />}
        {tab === 'diff' && <DiffTab />}
        {tab === 'sources' && <SourcesTab />}
        {tab === 'time' && <TimeTab />}
      </div>
      <p className="ab-foot">{edges.length} links across {claims.length} claims from {chunks.length} passages.</p>
    </div>
  )
}
