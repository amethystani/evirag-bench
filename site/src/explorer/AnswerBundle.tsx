import { Badge, BadgeGroup, Progress, Segmented } from '@nous-research/ui'
import { BarChart } from '@nous-research/ui/ui/components/graphs/index'
import { useState } from 'react'
import compare from '../answer_compare.json'
import { chunks, claims, contradictions, curve, meta, views } from './data'
import { CAUSE_PLAIN, claimOf, dominantCause, looksLikeCaveat, runChecks, tensions, trustLine, unsupportedWords } from './checks'
import { ClaimGraph } from './ClaimGraph'

type Tab = 'positions' | 'graph' | 'conflicts' | 'diff' | 'sources' | 'time'
const yearOf = (source: string) => chunks.find((c) => c.id === source)?.year
const docOf = (source: string) => source.split(':')[0]
const tierPct = (t: string) => (t === 'high' ? 90 : t === 'medium' ? 55 : 25)
const TIER_WORDS: Record<string, string> = { high: 'Well supported', medium: 'Partly supported', low: 'Thinly supported' }

function answerText() {
  const lines = [`Q: ${meta.question}`, '', views.length > 1 ? `The sources disagree. ${views.length} positions:` : 'One position:']
  views.forEach((v, i) => lines.push(`${i + 1}. ${v.position} (${[...new Set(v.sources.map(docOf))].join(', ')})`))
  const cause = dominantCause()
  if (cause) lines.push('', `Most likely reason they differ: ${CAUSE_PLAIN[cause] ?? cause} (automatic label).`)
  lines.push('', trustLine(), '', ...runChecks().map((c) => `${c.ok ? '[ok]' : '[check]'} ${c.label}`))
  return lines.join('\n')
}

function BottomLine() {
  const cause = dominantCause()
  const t = tensions()
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(answerText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }, () => {}) }
  return (
    <section className="ab-bottom" aria-label="Bottom line">
      <div className="ab-headrow"><p className="ab-kicker">Bottom line</p><button className="ab-copy" onClick={copy}>{copied ? 'Copied' : 'Copy answer'}</button></div>
      <p className="ab-lead">
        {views.length > 1
          ? `The sources do not agree, so this answer keeps ${views.length} positions apart instead of blending them into one.`
          : 'The sources broadly agree on one position.'}
      </p>
      <ol className="ab-positions">
        {views.map((v) => (
          <li key={v.position}>
            <span>{v.position}</span>
            <em>{[...new Set(v.sources.map(docOf))].map((d) => `${d}${yearOf(v.sources.find((s) => docOf(s) === d)!) ? `, ${yearOf(v.sources.find((s) => docOf(s) === d)!)}` : ''}`).join(' · ')}</em>
          </li>
        ))}
      </ol>
      {cause && t.length > 0 && (
        <p className="ab-why"><b>Why they differ.</b> Most likely because {CAUSE_PLAIN[cause] ?? cause}. This label is produced automatically; check it against the passages.</p>
      )}
      <p className="ab-trust">{trustLine()}</p>
    </section>
  )
}

function Checks() {
  const checks = runChecks()
  return (
    <section className="ab-checks" aria-label="Automatic checks">
      <p className="ab-kicker">Automatic checks</p>
      <ul>
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'ab-ok' : 'ab-warn'}>
            <span aria-hidden>{c.ok ? '✓' : '!'}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PositionsTab() {
  return (
    <div className="ab-stack">
      {views.map((v, i) => {
        const extra = unsupportedWords(v)
        return (
          <article key={v.position} className="ab-card">
            <div className="ab-card-head">
              <span className="ab-no">Position {i + 1}</span>
              <Badge type="outline" surface="blue">{TIER_WORDS[v.confidence_tier] ?? v.confidence_tier}</Badge>
            </div>
            <h4>{v.position}</h4>
            <p className="ab-p">{v.summary}</p>
            {v.weaknesses && !/^unclear/i.test(v.weaknesses) && <p className="ab-p ab-dim"><b>Limits.</b> {v.weaknesses}</p>}
            {extra.length > 0 && <p className="ab-flag">Check: “{extra.slice(0, 5).join(', ')}” does not appear in the passages this position cites.</p>}
            <Progress aria-label={`${v.confidence_tier} confidence`} value={tierPct(v.confidence_tier)} />
            <p className="ab-src">Cites {v.sources.map((s) => <code key={s}>{s}</code>)}</p>
          </article>
        )
      })}
    </div>
  )
}

function ConflictsTab() {
  const groups = tensions()
  return (
    <div className="ab-stack">
      <p className="ab-p ab-dim">Claim-level links are grouped by the two sources they come from, so one disagreement is not counted many times.</p>
      {groups.map((g) => (
        <article key={g.a + g.b} className="ab-card">
          <div className="ab-card-head">
            <span className="ab-no">{g.a} ({g.aYear}) vs {g.b} ({g.bYear})</span>
            <BadgeGroup surface="blue" type="outline">
              <BadgeGroup.Item>{g.direct} direct</BadgeGroup.Item>
              <BadgeGroup.Item>{g.pairs.length - g.direct} look like caveats</BadgeGroup.Item>
            </BadgeGroup>
          </div>
          {g.pairs.map((e, i) => {
            const a = claimOf(e.source), b = claimOf(e.target)
            const caveat = looksLikeCaveat(e)
            return (
              <div key={i} className={`ab-pair ${caveat ? 'ab-pair-dim' : ''}`}>
                <p><span className="ab-id">{a.doc_id}</span> {a.text}</p>
                <span className="ab-vs" aria-hidden>{caveat ? '≈' : '✕'}</span>
                <p><span className="ab-id">{b.doc_id}</span> {b.text}</p>
                <span className="ab-cause">{e.cda7 ?? 'no cause'}{caveat ? ' · caveat, not a direct contradiction' : ''}</span>
              </div>
            )
          })}
        </article>
      ))}
    </div>
  )
}

function DiffTab() {
  const cr = compare.cr as { full: number; vanilla: number; structured: number }
  return (
    <div className="ab-stack">
      <div className="ab-diff">
        <section className="ab-card">
          <p className="ab-no">Vanilla RAG: one answer</p>
          <p className="ab-p">{compare.vanilla}</p>
          <p className="ab-p ab-dim">Picks one side. The other position does not appear. Contradiction recall {cr.vanilla.toFixed(1)}.</p>
        </section>
        <section className="ab-card ab-card-hot">
          <p className="ab-no">EVIRAG: {views.length} positions</p>
          <ol className="ab-mini">{views.map((v) => <li key={v.position}>{v.position}</li>)}</ol>
          <p className="ab-p ab-dim">Keeps the disagreement and says where it comes from. Contradiction recall {cr.full.toFixed(1)}.</p>
        </section>
      </div>
      <section className="ab-card">
        <p className="ab-no">One structured prompt, no graph</p>
        <p className="ab-p">{compare.structured}</p>
        <p className="ab-p ab-dim">Contradiction recall {cr.structured.toFixed(1)}. On this single query a good prompt also names both sides, so this run does not show the graph beating it. That comparison is made on the full benchmark in the paper.</p>
      </section>
      <p className="ab-p ab-dim">Model: {compare.model}. One query on a two-passage demo corpus: it shows the mechanism, not benchmark quality.</p>
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

export function AnswerBundle() {
  const [tab, setTab] = useState<Tab>('positions')
  const [open, setOpen] = useState(false)
  return (
    <div className="ab">
      <BottomLine />
      <Checks />
      <div className="ab-more">
        <button className="ab-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide the reasoning' : 'Show the reasoning'} <span aria-hidden>{open ? '▴' : '▾'}</span></button>
        <span className="ab-meta">{claims.length} claims · {contradictions.length} claim-level contradiction links · {meta.model}</span>
      </div>
      {open && (
        <>
          <div className="ab-tabs">
            <Segmented aria-label="Reasoning" size="sm" value={tab} onChange={setTab} options={[
              { label: 'Positions', value: 'positions' }, { label: 'Graph', value: 'graph' }, { label: 'Conflicts', value: 'conflicts' },
              { label: 'Vs vanilla', value: 'diff' }, { label: 'Sources', value: 'sources' }, { label: 'Time', value: 'time' }
            ]} />
          </div>
          <div key={tab} className="ab-panel">
            {tab === 'positions' && <PositionsTab />}
            {tab === 'graph' && <ClaimGraph />}
            {tab === 'conflicts' && <ConflictsTab />}
            {tab === 'diff' && <DiffTab />}
            {tab === 'sources' && <SourcesTab />}
            {tab === 'time' && <TimeTab />}
          </div>
        </>
      )}
    </div>
  )
}
