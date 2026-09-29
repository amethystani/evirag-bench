import { Badge, BadgeGroup, Card, CardContent, CardDescription, CardHeader, CardTitle, HermesPortalShellLoggedIn, Input, ListItem, Progress, Separator, Stats } from '@nous-research/ui'
import { BarChart } from '@nous-research/ui/ui/components/graphs/index'
import { AnalyticsIcon } from '@nous-research/ui/ui/components/icons/analytics'
import { BookOpenIcon } from '@nous-research/ui/ui/components/icons/book-open'
import { HelpIcon } from '@nous-research/ui/ui/components/icons/help'
import { InfoBoxIcon } from '@nous-research/ui/ui/components/icons/info-box'
import { LoaderIcon } from '@nous-research/ui/ui/components/icons/loader'
import { RobotIcon } from '@nous-research/ui/ui/components/icons/robot'
import { ServerIcon } from '@nous-research/ui/ui/components/icons/server'
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import run from './smoke_full.json'
import './styles.css'

const REPO = 'https://github.com/amethystani/evirag-bench'

type View = { position: string; summary: string; weaknesses: string; sources: string[]; disagreement_causes: string[]; confidence_tier: string }
type Claim = { id: string; text: string; doc_id: string; chunk_id: string; year: number }
type Edge = { source: string; target: string; label: string; cda7: string | null }

const views = run.views as View[]
const claims = run.claims as Claim[]
const edges = run.edges as Edge[]
const chunks = run.retrieved_chunks as { id: string; title: string; year: number; section: string; text: string }[]
const curve = Object.entries(run.temporal_curve as unknown as Record<string, [number, number]>)
const contradictions = edges.filter((e) => e.label === 'contradicts')

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: AnalyticsIcon, shortcut: '1' },
  { id: 'views', label: 'Views', icon: RobotIcon, shortcut: '2' },
  { id: 'claims', label: 'Claims', icon: BookOpenIcon, shortcut: '3' },
  { id: 'graph', label: 'Graph', icon: ServerIcon, shortcut: '4' },
  { id: 'passages', label: 'Passages', icon: InfoBoxIcon, shortcut: '5' },
  { id: 'time', label: 'Time', icon: LoaderIcon, shortcut: '6' }
] as const
type SectionId = (typeof SECTIONS)[number]['id']

function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-[clamp(2.4rem,5vw,4.5rem)] leading-none font-light uppercase">{children}</h1>
      {sub && <p className="hw-mono mt-3 max-w-3xl text-sm normal-case opacity-75">{sub}</p>}
    </header>
  )
}

function Overview() {
  return (
    <>
      <Heading sub="One saved run of the smoke fixture, browsed the way a real run would be. Small model, two passages, one query.">{run.question}</Heading>
      <Stats items={[
        { label: 'Controversy class', value: run.controversy_class },
        { label: 'Views', value: String(views.length) },
        { label: 'Claims', value: String(claims.length) },
        { label: 'Contradiction links', value: String(contradictions.length) }
      ]} />
      <Separator className="my-8 opacity-30" />
      <div className="grid gap-4 md:grid-cols-3">
        {views.map((v, i) => (
          <Card key={v.position}>
            <CardHeader>
              <Badge type="outline" surface="white">View {i + 1}</Badge>
              <CardTitle className="mt-2 text-xl">{v.position}</CardTitle>
              <CardDescription>{v.confidence_tier} confidence</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress aria-label={`${v.confidence_tier} confidence`} value={v.confidence_tier === 'high' ? 90 : v.confidence_tier === 'medium' ? 55 : 25} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="hw-mono mt-8 text-xs normal-case opacity-70">Model: {run.model}. The same record is described in <a className="underline" href={`${REPO}/blob/main/docs/output.md`} target="_blank" rel="noopener noreferrer">docs/output.md</a>.</p>
    </>
  )
}

function Views() {
  return (
    <>
      <Heading sub="Each position keeps its own evidence, weaknesses, sources and confidence.">Views</Heading>
      <div className="grid gap-4">
        {views.map((v, i) => (
          <Card key={v.position}>
            <CardHeader>
              <Badge type="outline" surface="white">View {i + 1}</Badge>
              <CardTitle className="mt-2 text-2xl">{v.position}</CardTitle>
              <CardDescription>{v.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="hw-mono text-sm normal-case"><b>Weaknesses.</b> {v.weaknesses}</p>
              <BadgeGroup surface="white" type="outline">
                <BadgeGroup.Item>{v.confidence_tier} confidence</BadgeGroup.Item>
                {v.disagreement_causes.map((c) => <BadgeGroup.Item key={c}>{c}</BadgeGroup.Item>)}
                {v.sources.map((s) => <BadgeGroup.Item key={s}>{s}</BadgeGroup.Item>)}
              </BadgeGroup>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function Claims() {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(claims[0]?.id)
  const list = claims.filter((c) => c.text.toLowerCase().includes(q.toLowerCase()))
  const cur = claims.find((c) => c.id === sel)
  const links = edges.filter((e) => e.source === sel || e.target === sel)
  const chunk = chunks.find((c) => c.id === cur?.chunk_id)
  return (
    <>
      <Heading sub="Atomic claims extracted from the retrieved passages. Pick one to see its links and the passage it came from.">Claims</Heading>
      <div className="mb-4 max-w-md"><Input aria-label="Filter claims" placeholder="Filter claims" value={q} onChange={(e) => setQ(e.target.value)} surface="white" /></div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col">
          {list.map((c) => (
            <ListItem key={c.id} active={c.id === sel} onClick={() => setSel(c.id)}>
              <span className="hw-mono text-xs opacity-60">{c.id}</span> <span className="normal-case">{c.text}</span>
            </ListItem>
          ))}
          {list.length === 0 && <p className="hw-mono text-sm opacity-70">No claim matches.</p>}
        </div>
        {cur && (
          <Card>
            <CardHeader>
              <Badge type="outline" surface="white">{cur.id} · {cur.year}</Badge>
              <CardTitle className="mt-2 text-xl">{cur.text}</CardTitle>
              <CardDescription>From passage {cur.chunk_id}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {chunk && <p className="hw-mono border-l-2 pl-3 text-sm normal-case opacity-80">{chunk.text}</p>}
              <p className="hw-mono text-xs uppercase opacity-70">Links ({links.length})</p>
              {links.map((e, i) => (
                <p key={i} className="hw-mono text-sm normal-case">{e.source} {e.label === 'contradicts' ? '✕' : '✓'} {e.target}{e.cda7 ? ` · ${e.cda7}` : ''}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

function Graph() {
  const [hot, setHot] = useState<string | null>(null)
  const W = 520, H = 360, R = 140
  const pos = useMemo(() => Object.fromEntries(claims.map((c, i) => {
    const a = (Math.PI * 2 * i) / claims.length - Math.PI / 2
    return [c.id, [W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R]]
  })), [])
  const docs = [...new Set(claims.map((c) => c.doc_id))]
  const colors = ['#0000f2', '#c2185b']
  const near = (id: string) => hot === id || edges.some((e) => (e.source === hot && e.target === id) || (e.target === hot && e.source === id))
  return (
    <>
      <Heading sub="Green lines support, red dashed lines contradict. Hover a claim to isolate its links. Colour shows which document a claim came from.">Graph</Heading>
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border" role="img" aria-label="Claim graph">
          {edges.map((e, i) => {
            const [x1, y1] = pos[e.source], [x2, y2] = pos[e.target]
            const on = !hot || e.source === hot || e.target === hot
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={e.label === 'contradicts' ? '#e53935' : '#2e9e5b'} strokeWidth={2} strokeDasharray={e.label === 'contradicts' ? '6 5' : undefined} opacity={on ? 0.9 : 0.12} style={{ transition: 'opacity .25s' }} />
          })}
          {claims.map((c) => {
            const [x, y] = pos[c.id]
            return (
              <g key={c.id} onMouseEnter={() => setHot(c.id)} onMouseLeave={() => setHot(null)} opacity={!hot || near(c.id) ? 1 : 0.25} style={{ cursor: 'pointer', transition: 'opacity .25s' }}>
                <circle cx={x} cy={y} r={15} fill={colors[docs.indexOf(c.doc_id) % 2]} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="Courier Prime, monospace">{c.id}</text>
              </g>
            )
          })}
        </svg>
        <div className="grid content-start gap-3">
          {docs.map((d, i) => <p key={d} className="hw-mono text-sm"><i className="dot" style={{ background: colors[i % 2] }} />{d}</p>)}
          <Separator className="my-2 opacity-30" />
          <p className="hw-mono text-sm normal-case">{hot ? claims.find((c) => c.id === hot)?.text : 'Hover a claim to read it.'}</p>
        </div>
      </div>
    </>
  )
}

function Passages() {
  return (
    <>
      <Heading sub="The retrieved passages every view cites. Source IDs in the views resolve here.">Passages</Heading>
      <div className="grid gap-4">
        {chunks.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <Badge type="outline" surface="white">{c.id}</Badge>
              <CardTitle className="mt-2 text-xl">{c.title}</CardTitle>
              <CardDescription>{c.year} · {c.section}</CardDescription>
            </CardHeader>
            <CardContent><p className="hw-mono text-sm normal-case">{c.text}</p></CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function Time() {
  return (
    <>
      <Heading sub="Claims and contradiction links counted per publication year. Two years here, so the curve is tiny.">Time</Heading>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="hw-mono mb-2 text-xs uppercase opacity-70">Claims per year</p>
          <BarChart height={260} data={curve.map(([y, v]) => ({ year: y, n: v[0] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} claims`} />
        </div>
        <div>
          <p className="hw-mono mb-2 text-xs uppercase opacity-70">Contradiction links per year</p>
          <BarChart height={260} data={curve.map(([y, v]) => ({ year: y, n: v[1] }))} x="year" y="n" yDomain={[0, 8]} formatTooltip={(d) => `${String(d.year)}: ${String(d.n)} links`} />
        </div>
      </div>
    </>
  )
}

const PAGES: Record<SectionId, () => React.JSX.Element> = { overview: Overview, views: Views, claims: Claims, graph: Graph, passages: Passages, time: Time }

function Explorer() {
  const [section, setSection] = useState<SectionId>(() => (location.hash.slice(1) as SectionId) in PAGES ? (location.hash.slice(1) as SectionId) : 'overview')
  const go = (id: SectionId) => { setSection(id); history.replaceState(null, '', `#${id}`) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea')) return
      const hit = SECTIONS.find((s) => s.shortcut === e.key)
      if (hit) go(hit.id)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const Page = PAGES[section]
  return (
    <HermesPortalShellLoggedIn
      contextLabel="// Run"
      team={{ name: 'Homework fixture' }}
      user={{ name: 'Saved run', email: run.id, initials: 'SR' }}
      balance={{ label: 'Contradiction links', amount: String(contradictions.length), trendLabel: run.controversy_class }}
      navGroups={[
        { label: 'Browse', items: SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, shortcut: s.shortcut, active: s.id === section, onClick: () => go(s.id) })) },
        {
          label: 'Resources',
          items: [
            { id: 'docs', label: 'Docs', icon: BookOpenIcon, href: `${REPO}/tree/main/docs` },
            { id: 'home', label: 'Site', icon: HelpIcon, href: '../' }
          ]
        }
      ]}
    >
      <div key={section} className="explorer-page fade-swap"><Page /></div>
    </HermesPortalShellLoggedIn>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Explorer /></StrictMode>)
