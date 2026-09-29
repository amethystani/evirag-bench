import { Badge, BadgeGroup, Progress, Segmented } from '@nous-research/ui'
import { SimpleBars } from './SimpleBars'
import { useState } from 'react'
import type { RunData } from './data'
import { CAUSE_PLAIN, claimOf, contradictionsOf, dominantCause, looksLikeCaveat, runChecks, tensions, trustLine, unsupportedWords } from './checks'
import { ClaimGraph } from './ClaimGraph'

type Tab = 'positions' | 'graph' | 'conflicts' | 'diff' | 'sources' | 'time'
const docOf = (source: string) => source.split(':')[0]
const tierPct = (t: string) => (t === 'high' ? 90 : t === 'medium' ? 55 : 25)
const TIER_WORDS: Record<string, string> = { high: 'Well supported', medium: 'Partly supported', low: 'Thinly supported' }
const cite = (run: RunData, source: string) => {
  const c = run.chunks.find((x) => x.id === source)
  if (!c) return docOf(source)
  const first = (c.authors ?? '').split(',')[0].trim().split(' ').slice(-1)[0]
  return first ? `${first}${(c.authors ?? '').includes(',') || (c.authors ?? '').includes('et al') ? ' et al.' : ''}, ${c.year}` : `${c.year}`
}

function answerText(run: RunData) {
  const lines = [`Q: ${run.question}`, '', headline(run), '']
  run.views.forEach((v, i) => lines.push(`${i + 1}. ${v.position} (${[...new Set(v.sources.map((s) => cite(run, s)))].join('; ')})`))
  const cause = dominantCause(run)
  if (cause) lines.push('', `Most likely reason they differ: ${CAUSE_PLAIN[cause] ?? cause} (automatic label).`)
  lines.push('', trustLine(run), '', ...runChecks(run).map((c) => `${c.ok ? '[ok]' : '[check]'} ${c.label}`))
  return lines.join('\n')
}

/** The headline follows the evidence: "disagree" only when a real contradiction was found. */
function headline(run: RunData) {
  const direct = tensions(run).some((t) => t.direct > 0)
  if (run.views.length === 0) return 'No position could be formed from the retrieved sources.'
  if (direct && run.views.length > 1) return `The sources disagree, so this answer keeps ${run.views.length} positions apart instead of blending them into one.`
  if (run.views.length > 1) return `These sources report ${run.views.length} different findings. No direct contradiction between them was found.`
  return 'The retrieved sources broadly point the same way.'
}

function BottomLine({ run }: { run: RunData }) {
  const cause = dominantCause(run)
  const t = tensions(run)
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(answerText(run)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }, () => {}) }
  return (
    <section className="ab-bottom" aria-label="Bottom line">
      <div className="ab-headrow"><p className="ab-kicker">Bottom line</p><button className="ab-copy" onClick={copy}>{copied ? 'Copied' : 'Copy answer'}</button></div>
      <p className="ab-lead">{headline(run)}</p>
      <ol className="ab-positions">
        {run.views.map((v) => (
          <li key={v.position}>
            <span>{v.position}</span>
            <em>{[...new Set(v.sources.map((s) => cite(run, s)))].join(' · ')}</em>
          </li>
        ))}
      </ol>
      {cause && t.length > 0 && (
        <p className="ab-why"><b>Why they differ.</b> Most likely because {CAUSE_PLAIN[cause] ?? cause}. This label is produced automatically; check it against the passages.</p>
      )}
      <p className="ab-trust">{trustLine(run)}</p>
      {run.source === 'device' && <p className="ab-scope">Answered from a small bundled set of openly licensed abstracts ({run.chunks.length} used here), so it can miss the key studies on a topic. Treat it as a demonstration of the method, not a literature review.</p>}
    </section>
  )
}

function Checks({ run }: { run: RunData }) {
  return (
    <section className="ab-checks" aria-label="Automatic checks">
      <p className="ab-kicker">Automatic checks</p>
      <ul>
        {runChecks(run).map((c) => (
          <li key={c.label} className={c.ok ? 'ab-ok' : 'ab-warn'}>
            <span aria-hidden>{c.ok ? '✓' : '!'}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PositionsTab({ run }: { run: RunData }) {
  return (
    <div className="ab-stack">
      {run.views.map((v, i) => {
        const extra = unsupportedWords(run, v)
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

function ConflictsTab({ run }: { run: RunData }) {
  const groups = tensions(run)
  if (!groups.length) return <p className="ab-p ab-dim">No contradicting claims were found among the retrieved passages.</p>
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
            const a = claimOf(run, e.source), b = claimOf(run, e.target)
            const caveat = looksLikeCaveat(run, e)
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

function DiffTab({ run }: { run: RunData }) {
  return (
    <div className="ab-stack">
      <div className="ab-diff">
        <section className="ab-card">
          <p className="ab-no">Vanilla RAG: one answer</p>
          <p className="ab-p">{run.vanilla || 'No single-answer baseline was produced for this run.'}</p>
          <p className="ab-p ab-dim">Picks one reading of the sources.{run.cr ? ` Contradiction recall ${run.cr.vanilla.toFixed(1)}.` : ''}</p>
        </section>
        <section className="ab-card ab-card-hot">
          <p className="ab-no">EVIRAG: {run.views.length} position{run.views.length === 1 ? '' : 's'}</p>
          <ol className="ab-mini">{run.views.map((v) => <li key={v.position}>{v.position}</li>)}</ol>
          <p className="ab-p ab-dim">Keeps the disagreement and says where it comes from.{run.cr ? ` Contradiction recall ${run.cr.full.toFixed(1)}.` : ''}</p>
        </section>
      </div>
      {run.structured && (
        <section className="ab-card">
          <p className="ab-no">One structured prompt, no graph</p>
          <p className="ab-p">{run.structured}</p>
          <p className="ab-p ab-dim">On this single query a good prompt can also name both sides, so one run does not show the graph beating it. That comparison is made on the full benchmark in the paper.</p>
        </section>
      )}
      <p className="ab-p ab-dim">Model: {run.model}. {run.source === 'saved' ? 'One query on a two-passage demo corpus: it shows the mechanism, not benchmark quality.' : 'Produced on this device by a very small model, so treat the labels as candidates.'}</p>
    </div>
  )
}

function SourcesTab({ run }: { run: RunData }) {
  return (
    <div className="ab-stack">
      {run.chunks.map((c) => (
        <article key={c.id} className="ab-card">
          <div className="ab-card-head"><span className="ab-no">{c.id}</span><span className="ab-id">{c.year}{c.license ? ` · ${c.license.toUpperCase()}` : ''}</span></div>
          <h4>{c.title}</h4>
          {c.authors && <p className="ab-id">{c.authors}{c.doi ? <> · <a href={c.doi} target="_blank" rel="noopener noreferrer">{c.doi.replace('https://doi.org/', 'doi:')}</a></> : null}</p>}
          <p className="ab-p">{c.text}</p>
        </article>
      ))}
    </div>
  )
}

function TimeTab({ run }: { run: RunData }) {
  const top = Math.max(2, ...run.curve.flatMap(([, v]) => v)) + 1
  return (
    <div className="ab-grid2">
      <div>
        <p className="ab-no">Claims per year</p>
        <SimpleBars label="Claims per year" data={run.curve.map(([y, v]) => ({ label: y, value: v[0] }))} max={top} color="#edff45" />
      </div>
      <div>
        <p className="ab-no">Contradiction links per year</p>
        <SimpleBars label="Contradiction links per year" data={run.curve.map(([y, v]) => ({ label: y, value: v[1] }))} max={top} color="#ff6b6b" />
      </div>
    </div>
  )
}

export function TabView({ run, tab }: { run: RunData; tab: Exclude<Tab, 'positions'> | 'positions' }) {
  return (
    <>
      {tab === 'positions' && <PositionsTab run={run} />}
      {tab === 'graph' && <ClaimGraph run={run} />}
      {tab === 'conflicts' && <ConflictsTab run={run} />}
      {tab === 'diff' && <DiffTab run={run} />}
      {tab === 'sources' && <SourcesTab run={run} />}
      {tab === 'time' && <TimeTab run={run} />}
    </>
  )
}

export function AnswerBundle({ run }: { run: RunData }) {
  const [tab, setTab] = useState<Tab>('positions')
  const [open, setOpen] = useState(false)
  return (
    <div className="ab">
      <BottomLine run={run} />
      <Checks run={run} />
      <div className="ab-more">
        <button className="ab-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide the reasoning' : 'Show the reasoning'} <span aria-hidden>{open ? '▴' : '▾'}</span></button>
        <span className="ab-meta">{run.claims.length} claims · {contradictionsOf(run).length} claim-level contradiction links · {run.model}{run.seconds ? ` · ${run.seconds}s on this device` : ''}</span>
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
            {tab === 'positions' && <PositionsTab run={run} />}
            {tab === 'graph' && <ClaimGraph run={run} />}
            {tab === 'conflicts' && <ConflictsTab run={run} />}
            {tab === 'diff' && <DiffTab run={run} />}
            {tab === 'sources' && <SourcesTab run={run} />}
            {tab === 'time' && <TimeTab run={run} />}
          </div>
        </>
      )}
    </div>
  )
}
