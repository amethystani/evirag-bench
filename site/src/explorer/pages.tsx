import { Badge, BadgeGroup, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, ListItem, Progress, Segmented, Select, SelectOption, Separator, Stats, Switch, Tabs, TabsList, TabsPanel, TabsTrigger } from '@nous-research/ui'
import { BarChart } from '@nous-research/ui/ui/components/graphs/index'
import { useMemo, useState } from 'react'
import outputDoc from '../../../docs/output.md?raw'
import cdaDoc from '../../../docs/cda7.md?raw'
import settingsDoc from '../../../docs/run-settings.md?raw'
import annotationDoc from '../../../docs/annotation.md?raw'
import { chunks, claims, contradictions, curve, edges, meta, REPO, STAGES, supports, SYSTEMS, views } from './data'
import { Markdown } from './markdown'

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="ex-title">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  )
}

const tierPct = (t: string) => (t === 'high' ? 90 : t === 'medium' ? 55 : 25)

export function Overview({ go }: { go: (p: string) => void }) {
  return (
    <>
      <PageTitle title={meta.question} sub={`Saved run ${meta.id} · model ${meta.model} · one query, two passages. It shows the format, not benchmark quality.`} />
      <Stats items={[
        { label: 'Controversy class', value: meta.cls },
        { label: 'Views', value: String(views.length) },
        { label: 'Claims', value: String(claims.length) },
        { label: 'Contradiction links', value: String(contradictions.length) }
      ]} />
      <Separator className="my-8 opacity-30" />
      <h2 className="ex-h2">Pipeline</h2>
      <ol className="ex-stages">
        {STAGES.map(([name, what, out], i) => (
          <li key={name}>
            <span className="ex-stage-no">{String(i + 1).padStart(2, '0')}</span>
            <div><b>{name}</b><span>{what}</span></div>
            <Badge type="outline" surface="white">{out}</Badge>
          </li>
        ))}
      </ol>
      <Separator className="my-8 opacity-30" />
      <h2 className="ex-h2">Views</h2>
      <div className="ex-grid3">
        {views.map((v, i) => (
          <Card key={v.position}>
            <CardHeader>
              <Badge type="outline" surface="white">View {i + 1}</Badge>
              <CardTitle className="mt-2 text-lg">{v.position}</CardTitle>
              <CardDescription>{v.confidence_tier} confidence</CardDescription>
            </CardHeader>
            <CardContent><Progress aria-label={`${v.confidence_tier} confidence`} value={tierPct(v.confidence_tier)} /></CardContent>
          </Card>
        ))}
      </div>
      <p className="ex-note">Open <button className="ex-link" onClick={() => go('/graph')}>the claim graph</button> or <button className="ex-link" onClick={() => go('/metrics')}>the paper's results</button>.</p>
    </>
  )
}

export function Views() {
  const [tier, setTier] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const list = views.filter((v) => tier === 'all' || v.confidence_tier === tier)
  return (
    <>
      <PageTitle title="Views" sub="Each position keeps its own evidence, weaknesses, sources and confidence." />
      <div className="ex-toolbar"><Segmented aria-label="Confidence" value={tier} onChange={setTier} options={[{ label: 'All', value: 'all' }, { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }]} /></div>
      <div className="ex-stack">
        {list.map((v, i) => (
          <Card key={v.position}>
            <CardHeader>
              <Badge type="outline" surface="white">View {views.indexOf(v) + 1}</Badge>
              <CardTitle className="mt-2 text-2xl">{v.position}</CardTitle>
              <CardDescription>{v.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="ex-mono"><b>Weaknesses.</b> {v.weaknesses}</p>
              <BadgeGroup surface="white" type="outline">
                <BadgeGroup.Item>{v.confidence_tier} confidence</BadgeGroup.Item>
                {v.disagreement_causes.map((c) => <BadgeGroup.Item key={c}>{c}</BadgeGroup.Item>)}
                {v.sources.map((s) => <BadgeGroup.Item key={s + i}>{s}</BadgeGroup.Item>)}
              </BadgeGroup>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="ex-note">No view has {tier} confidence.</p>}
      </div>
    </>
  )
}

export function Claims() {
  const [q, setQ] = useState('')
  const [doc, setDoc] = useState('all')
  const [sel, setSel] = useState(claims[0]?.id)
  const docs = [...new Set(claims.map((c) => c.doc_id))]
  const list = claims.filter((c) => (doc === 'all' || c.doc_id === doc) && c.text.toLowerCase().includes(q.toLowerCase()))
  const cur = claims.find((c) => c.id === sel)
  const links = edges.filter((e) => e.source === sel || e.target === sel)
  const chunk = chunks.find((c) => c.id === cur?.chunk_id)
  return (
    <>
      <PageTitle title="Claims" sub="Atomic claims extracted from the retrieved passages. Pick one to see its links and its source passage." />
      <div className="ex-toolbar">
        <div className="ex-grow"><Input aria-label="Filter claims" placeholder="Filter claims" value={q} onChange={(e) => setQ(e.target.value)} surface="white" /></div>
        <Select aria-label="Document" surface="white" value={doc} onValueChange={setDoc}>
          <SelectOption value="all">All documents</SelectOption>
          {docs.map((d) => <SelectOption key={d} value={d}>{d}</SelectOption>)}
        </Select>
      </div>
      <div className="ex-split">
        <div className="ex-list">
          {list.map((c) => (
            <ListItem key={c.id} active={c.id === sel} onClick={() => setSel(c.id)}>
              <span className="ex-id">{c.id}</span> <span>{c.text}</span>
            </ListItem>
          ))}
          {list.length === 0 && <p className="ex-note">No claim matches.</p>}
        </div>
        {cur && (
          <Card>
            <CardHeader>
              <Badge type="outline" surface="white">{cur.id} · {cur.year}</Badge>
              <CardTitle className="mt-2 text-xl">{cur.text}</CardTitle>
              <CardDescription>From passage {cur.chunk_id}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {chunk && <p className="ex-quote">{chunk.text}</p>}
              <p className="ex-label">Links ({links.length})</p>
              {links.map((e, i) => (
                <p key={i} className="ex-mono">{e.source} {e.label === 'contradicts' ? '✕' : '✓'} {e.target}{e.cda7 ? ` · ${e.cda7}` : ''}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export function Graph() {
  const [hot, setHot] = useState<string | null>(null)
  const [showSup, setShowSup] = useState(true)
  const [showCon, setShowCon] = useState(true)
  const [layout, setLayout] = useState<'ring' | 'docs'>('docs')
  const W = 560, H = 380
  const docs = [...new Set(claims.map((c) => c.doc_id))]
  const colors = ['#1f3fbf', '#c2185b', '#2e7d32']
  const pos = useMemo(() => {
    const p: Record<string, [number, number]> = {}
    if (layout === 'ring') {
      claims.forEach((c, i) => {
        const a = (Math.PI * 2 * i) / claims.length - Math.PI / 2
        p[c.id] = [W / 2 + Math.cos(a) * 150, H / 2 + Math.sin(a) * 150]
      })
    } else {
      docs.forEach((d, di) => {
        const group = claims.filter((c) => c.doc_id === d)
        group.forEach((c, i) => {
          const a = (Math.PI * 2 * i) / group.length - Math.PI / 2
          const cx = W * ((di + 1) / (docs.length + 1))
          p[c.id] = [cx + Math.cos(a) * 70, H / 2 + Math.sin(a) * 110]
        })
      })
    }
    return p
  }, [layout, docs.length])
  const near = (id: string) => hot === id || edges.some((e) => (e.source === hot && e.target === id) || (e.target === hot && e.source === id))
  return (
    <>
      <PageTitle title="Graph" sub="Support links are green, contradiction links are red and dashed. Hover a claim to isolate its links." />
      <div className="ex-toolbar">
        <Segmented aria-label="Layout" value={layout} onChange={setLayout} options={[{ label: 'By document', value: 'docs' }, { label: 'Ring', value: 'ring' }]} />
        <label className="ex-switch"><Switch checked={showSup} onCheckedChange={setShowSup} aria-label="Show support links" /> Support ({supports.length})</label>
        <label className="ex-switch"><Switch checked={showCon} onCheckedChange={setShowCon} aria-label="Show contradiction links" /> Contradiction ({contradictions.length})</label>
      </div>
      <div className="ex-split ex-split-wide">
        <svg viewBox={`0 0 ${W} ${H}`} className="ex-graph" role="img" aria-label="Claim graph">
          {edges.map((e, i) => {
            if ((e.label === 'contradicts' && !showCon) || (e.label !== 'contradicts' && !showSup)) return null
            const [x1, y1] = pos[e.source], [x2, y2] = pos[e.target]
            const on = !hot || e.source === hot || e.target === hot
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={e.label === 'contradicts' ? '#e53935' : '#2e9e5b'} strokeWidth={2} strokeDasharray={e.label === 'contradicts' ? '6 5' : undefined} opacity={on ? 0.9 : 0.1} style={{ transition: 'opacity .25s' }} />
          })}
          {claims.map((c) => {
            const [x, y] = pos[c.id]
            return (
              <g key={c.id} onMouseEnter={() => setHot(c.id)} onMouseLeave={() => setHot(null)} opacity={!hot || near(c.id) ? 1 : 0.25} style={{ cursor: 'pointer', transition: 'opacity .25s' }}>
                <circle cx={x} cy={y} r={16} fill={colors[docs.indexOf(c.doc_id) % 3]} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="Courier Prime, monospace">{c.id}</text>
              </g>
            )
          })}
        </svg>
        <div className="ex-side">
          {docs.map((d, i) => <p key={d} className="ex-mono"><i className="ex-dot" style={{ background: colors[i % 3] }} />{d}</p>)}
          <Separator className="my-2 opacity-30" />
          <p className="ex-mono">{hot ? claims.find((c) => c.id === hot)?.text : 'Hover a claim to read it.'}</p>
        </div>
      </div>
    </>
  )
}

export function Passages() {
  return (
    <>
      <PageTitle title="Passages" sub="The retrieved passages every view cites. Source IDs in the views resolve here." />
      <div className="ex-stack">
        {chunks.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <Badge type="outline" surface="white">{c.id}</Badge>
              <CardTitle className="mt-2 text-xl">{c.title}</CardTitle>
              <CardDescription>{c.year} · {c.section}</CardDescription>
            </CardHeader>
            <CardContent><p className="ex-mono">{c.text}</p></CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function Time() {
  return (
    <>
      <PageTitle title="Time" sub="Claims and contradiction links counted per publication year. Two years here, so the curve is tiny." />
      <div className="ex-grid2">
        <div>
          <p className="ex-label">Claims per year</p>
          <BarChart height={260} data={curve.map(([y, v]) => ({ year: y, n: v[0] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} claims`} />
        </div>
        <div>
          <p className="ex-label">Contradiction links per year</p>
          <BarChart height={260} data={curve.map(([y, v]) => ({ year: y, n: v[1] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} links`} />
        </div>
      </div>
    </>
  )
}

export function Metrics() {
  const [metric, setMetric] = useState<'cr' | 'vc'>('cr')
  return (
    <>
      <PageTitle title="Results" sub="Numbers reported in the paper (35B open model, full benchmark and a 250-query control subset). They are not produced by the smoke run in this repository." />
      <div className="ex-toolbar"><Segmented aria-label="Metric" value={metric} onChange={setMetric} options={[{ label: 'Contradiction recall', value: 'cr' }, { label: 'Viewpoint coverage', value: 'vc' }]} /></div>
      <BarChart height={320} data={SYSTEMS.map((s) => ({ name: s.name, v: metric === 'cr' ? s.cr : s.vc }))} x="name" y="v" yDomain={[0, 1]} formatY={(v) => v.toFixed(1)} formatTooltip={(d) => `${String(d.name)}: ${Number(d.v).toFixed(3)}`} />
      <div className="ex-table-wrap">
        <table className="md-table">
          <thead><tr><th>System</th><th>Coverage</th><th>Contradiction recall</th><th>LLM calls</th></tr></thead>
          <tbody>{SYSTEMS.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.vc.toFixed(3)}</td><td>{s.cr.toFixed(3)}</td><td>{s.calls}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="ex-note">One structured prompt closes most of the coverage gap but adds almost nothing to contradiction recall over the budget-matched control. The claim graph is what recovers contradictions, at about 14 generation calls per query against 1. A call-matched control has not been run.</p>
    </>
  )
}

const DOCS: [string, string, string][] = [
  ['output', 'Output format', outputDoc],
  ['cda7', 'CDA-7 guide', cdaDoc],
  ['settings', 'Run settings', settingsDoc],
  ['annotation', 'Annotation', annotationDoc]
]
export const docsIndex = DOCS.map(([id, title, body]) => ({ id, title, body }))

export function Docs() {
  return (
    <>
      <PageTitle title="Docs" sub="The repository docs, rendered here. They are the same files under docs/." />
      <Tabs defaultValue="output">
        {(active, setActive) => (
          <div>
            <TabsList variant="command">
              {DOCS.map(([id, title]) => <TabsTrigger key={id} variant="command" active={active === id} value={id} onClick={() => setActive(id)}>{title}</TabsTrigger>)}
            </TabsList>
            {DOCS.map(([id, , body]) => (
              <TabsPanel key={id} active={active === id} value={id} className="mt-6"><Markdown source={body} /></TabsPanel>
            ))}
          </div>
        )}
      </Tabs>
      <p className="ex-note">Source: <a href={`${REPO}/tree/main/docs`} target="_blank" rel="noopener noreferrer">docs/ on GitHub</a>.</p>
    </>
  )
}
