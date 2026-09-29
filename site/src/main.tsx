import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  createHermesLandingContent,
  FilmGrain,
  createHermesPricingContent,
  HermesHeader,
  HermesLandingFeatures,
  HermesLandingHero,
  HermesLandingPlatforms,
  HermesLandingPortalFooter,
  HermesLandingScroll,
  HermesLandingShell,
  HermesLandingShowcase,
  PricingTiers,
  Scramble
} from '@nous-research/ui'
import type { HermesLandingContent, HermesLandingDownloads, HermesPricingContent } from '@nous-research/ui'
import { AppleIcon } from '@nous-research/ui/ui/components/icons/apple'
import { AppWindowIcon } from '@nous-research/ui/ui/components/icons/app-window'
import { DownloadIcon } from '@nous-research/ui/ui/components/icons/download'
import { LoginIcon } from '@nous-research/ui/ui/components/icons/login'
import { TerminalIcon } from '@nous-research/ui/ui/components/icons/terminal'
import { UbuntuIcon } from '@nous-research/ui/ui/components/icons/ubuntu'
import { WindowsIcon } from '@nous-research/ui/ui/components/icons/windows'
import { StrictMode } from 'react'
import { CountUp, Reveal } from './hooks'
import { Problem } from './sections/Problem'
import { Example } from './sections/Example'
import { Pipeline } from './sections/Pipeline'
import { Agents } from './sections/Agents'
import { Cda7 } from './sections/Cda7'
import { Graph } from './sections/Graph'
import { Typology } from './sections/Typology'
import { Bench } from './sections/Bench'
import { Metrics } from './sections/Metrics'
import { Results } from './sections/Results'
import { Output } from './sections/Output'
import { Glossary } from './sections/Glossary'
import { Overlay } from './retro/Overlay'
import { Statement } from './retro/Statement'
import { enableTilt } from './retro/tilt'
import { Boot } from './retro/Boot'
import { Timeline } from './retro/Timeline'
import { createRoot } from 'react-dom/client'
import './fonts'
import './styles.css'

const REPO = 'https://github.com/amethystani/evirag-bench'

const base = createHermesLandingContent()

const features: HermesLandingContent['features'] = [
  { ...base.features[0], index: '#1 Retrieve', title: 'Four Roles',
    body: 'Precision, recall, skeptic and counterfactual retrieval passes, so the evidence pool is not one-sided before generation starts.' },
  { ...base.features[1], index: '#2 Extract', title: 'Atomic Claims',
    body: 'Every passage is broken into checkable claims that stay linked to their document, chunk and year.' },
  { ...base.features[2], index: '#3 Explain', title: 'Why Sources Disagree',
    body: 'Each contradiction gets a CDA-7 cause: replication, population, operational, methodological, statistical, temporal or theoretical.' },
  { ...base.features[3], index: '#4 Partition', title: 'Signed Louvain',
    body: 'Support and contradiction edges are partitioned into communities, so each position is a group of claims rather than a single quote.' },
  { ...base.features[4], index: '#5 Trace', title: 'Temporal Evidence',
    body: 'Claims and contradiction links are counted per year, showing whether a dispute is emerging, stable or settling.' },
  { ...base.features[5], index: '#6 Answer', title: 'Source-Linked Views',
    body: 'Each view has a position, evidence summary, weaknesses, disagreement causes, passage IDs and a confidence tier.' }
]

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

const content: HermesLandingContent = {
  ...base,
  assets: {
    ...base.assets,
    badge: BLANK,
    nousLogo: BLANK,
    footerGirl: { poster: BLANK, stackedSrc: '', webmSrc: '' }
  },
  downloadLabel: 'Get the code',
  features,
  footer: {
    legal: [
      { href: `${REPO}/blob/main/LICENSE`, label: 'License' },
      { href: `${REPO}/blob/main/SECURITY.md`, label: 'Security' }
    ],
    license: 'MIT License &bull; 2026',
    org: 'Evirag'
  },
  hero: {
    ...base.hero,
    eyebrow: 'Open Source &bull; MIT License',
    titleLines: ['Retrieval', 'That Keeps', 'The Debate']
  },
  install: {
    ...base.install,
    label: 'Run locally',
    unixCommand: `cargo install --git ${REPO}`,
    widthAnchor: `cargo install --git ${REPO}`,
    windowsCommand: `git clone ${REPO}`
  },
  platforms: [
    { detail: 'macOS and Linux', match: ['Mac'], os: 'mac', title: 'Prebuilt Binary' },
    { detail: 'Rust, any platform', match: ['Win'], os: 'windows', title: 'Source Code' },
    { detail: 'Ollama and cargo', match: ['Linux', 'X11'], os: 'linux', title: 'Run Locally' }
  ],
  portal: {
    body: 'Disagreement-Aware Scientific Retrieval-Augmented Generation. Mishra, Sharma and Khetarpaul.',
    cta: 'Read the paper',
    eyebrow: 'Beyond Epistemic Collapse',
    href: `${REPO}/blob/main/paper/paper.pdf`,
    title: 'The Paper'
  }
}

const SOURCE_ZIP = `${REPO}/archive/refs/heads/main.zip`
// Hero button: always the source archive. Cards: binary, source, local run.
const heroDownloads: HermesLandingDownloads = {
  mac: { direct: true, href: SOURCE_ZIP },
  linux: { direct: true, href: SOURCE_ZIP },
  windows: { direct: true, href: SOURCE_ZIP }
}
const downloads: HermesLandingDownloads = {
  mac: { direct: false, href: `${REPO}/releases/latest` },
  linux: { direct: false, href: '#install' },
  windows: { direct: true, href: SOURCE_ZIP }
}

const basePricing = createHermesPricingContent()
const tierText = [
  { label: 'Smoke', actionLabel: 'Run the smoke test', price: { primary: '1', primarySuffix: 'query' },
    bullets: ['Two-passage fixture', 'qwen2.5:0.5b by default', 'Runs on a laptop', 'scripts/smoke.sh'] },
  { label: 'Pilot', actionLabel: 'Validate a pilot', price: { primary: '50+', primarySuffix: 'queries' },
    bullets: ['Your own gold annotations', 'validate-gold checks the schema', 'All baselines available', 'Per-query metrics'] },
  { label: 'Full', actionLabel: 'Run the benchmark', price: { primary: '1,250', primarySuffix: 'queries' },
    bullets: ['Five domains', 'Full EVIRAG, ablations and controls', 'Bootstrap intervals', 'Paired Wilcoxon tests'] },
  { label: 'Yours', actionLabel: 'Bring a corpus', price: { primary: 'Any', primarySuffix: 'corpus' },
    bullets: ['JSONL documents', 'OpenAlex fetcher included', 'Same output schema', 'Source-linked views'] }
]
const pricing: HermesPricingContent = {
  ...basePricing,
  assets: { badge: BLANK },
  tiers: basePricing.tiers.map((tier, i) => ({ ...tier, ...tierText[i], badge: undefined }))
}

const faqs = [
  ['What does EVIRAG output?', 'A set of distinct views. Each has a position, evidence summary, weaknesses, disagreement causes, passage IDs and a confidence tier, plus atomic claims, graph edges and a temporal curve.'],
  ['How do I get started?', 'Install Rust and Ollama, run cargo build --release, then ./scripts/smoke.sh. The smoke test chunks a two-document fixture, indexes it, runs the full pipeline and evaluates the result.'],
  ['Which models does it need?', 'A chat model and an embedding model through Ollama. The default is qwen3.6:35b-a3b with all-minilm; the smoke test uses qwen2.5:0.5b.'],
  ['Can I use my own corpus?', 'Yes. Provide documents as JSON Lines with an id, title and text, optionally with year, venue, domain, DOI and sections. Gold annotations follow data/schema.example.json.'],
  ['What is CDA-7?', 'Seven causes of disagreement: replication, population, operational, methodological, statistical, temporal and theoretical. Every contradiction edge carries one primary cause.'],
  ['Is the benchmark result available?', 'Not yet. The repository ships the pipeline, metrics and a smoke fixture. A full 1,250-query run is tracked as an open issue.']
]

const footerColumns: [string, [string, string][]][] = [
  ['Project', [['Repository', REPO], ['Releases', `${REPO}/releases`], ['Changelog', `${REPO}/blob/main/CHANGELOG.md`], ['Issues', `${REPO}/issues`]]],
  ['Run', [['Quickstart', `${REPO}#ii-quickstart`], ['Smoke test', `${REPO}/blob/main/scripts/smoke.sh`], ['Output format', `${REPO}/blob/main/docs/output.md`], ['CDA-7 guide', `${REPO}/blob/main/docs/cda7.md`]]],
  ['Benchmark', [['Annotation guide', `${REPO}/blob/main/docs/annotation.md`], ['Run settings', `${REPO}/blob/main/docs/run-settings.md`], ['Gold schema', `${REPO}/blob/main/data/schema.example.json`]]],
  ['Paper', [['Read the PDF', `${REPO}/blob/main/paper/paper.pdf`], ['Cite', `${REPO}/blob/main/CITATION.cff`], ['Contribute', `${REPO}/blob/main/CONTRIBUTING.md`]]]
]

function SiteFooter() {
  return (
    <footer className="bg-white px-[var(--hw-gutter)] py-[calc(90*var(--u))] text-[var(--hw-bg)]">
      <div className="grid grid-cols-2 gap-[calc(60*var(--u))] md:grid-cols-4">
        {footerColumns.map(([title, links], i) => (
          <Reveal key={title} delay={i * 100} className="flex flex-col gap-[calc(20*var(--u))]">
            <h3 className="text-[calc(48*var(--u))] leading-none font-light tracking-[0.03em] uppercase max-md:text-3xl"><Scramble>{title}</Scramble></h3>
            <ul className="hw-mono flex flex-col gap-[calc(10*var(--u))] text-[var(--hw-text-body)] uppercase max-md:text-xs">
              {links.map(([label, href]) => (
                <li key={label}><a href={href} rel="noopener noreferrer" target="_blank">{label}</a></li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
      <p className="hw-mono mt-[calc(90*var(--u))] text-[var(--hw-text-body)] uppercase max-md:text-xs">
        Evirag Bench &bull; MIT License &bull; 2026
      </p>
    </footer>
  )
}

const stats: [number, string, string][] = [
  [1250, '', 'Gold queries'],
  [5, '', 'Domains'],
  [7, '', 'Disagreement causes'],
  [4, '', 'Retrieval roles']
]

function Stats() {
  return (
    <section className="px-[var(--hw-gutter)] pt-[calc(80*var(--u))] pb-[calc(40*var(--u))]">
      <div className="grid grid-cols-2 gap-[calc(40*var(--u))] md:grid-cols-4">
        {stats.map(([n, suffix, label], i) => (
          <Reveal key={label} delay={i * 90}>
            <div className="text-[calc(150*var(--u))] leading-none font-light tracking-[0.02em] max-md:text-6xl"><CountUp to={n} suffix={suffix} /></div>
            <p className="hw-mono mt-[calc(16*var(--u))] text-[var(--hw-text-body)] uppercase max-md:text-xs">{label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-[var(--hw-gutter)] pt-[calc(60*var(--u))]">{children}</div>
}

function App() {
  return (
    <HermesLandingShell>
      <HermesLandingScroll />
      <FilmGrain />
      <Overlay />
      <HermesHeader
        nav={{
          beforeLogo: [
            {
              type: 'dropdown',
              hierarchy: 'secondary',
              label: 'Install',
              prefix: <DownloadIcon className="!size-[18px] shrink-0" />,
              items: [
                { href: '#downloads', icon: <AppleIcon aria-hidden className="size-6" />, label: 'Prebuilt binary' },
                { href: '#downloads', icon: <WindowsIcon aria-hidden className="size-6" />, label: 'Source code' },
                { href: '#install', icon: <UbuntuIcon aria-hidden className="size-6" />, label: 'Run locally' }
              ]
            },
            { type: 'link', label: 'Learn', href: '#problem' },
            { type: 'link', label: 'Runs', href: '#runs' },
            { type: 'link', label: 'Demo', href: 'demo/' }
          ],
          afterLogo: [
            { type: 'link', label: 'Docs', href: `${REPO}/tree/main/docs` },
            {
              type: 'dropdown',
              hierarchy: 'ghost',
              label: 'Project',
              items: [
                { external: true, href: REPO, icon: <AppWindowIcon aria-hidden className="size-6" />, label: 'Repository' },
                { external: true, href: `${REPO}/releases`, icon: <DownloadIcon aria-hidden className="size-6" />, label: 'Releases' },
                { external: true, href: `${REPO}/issues`, icon: <TerminalIcon aria-hidden className="size-6" />, label: 'Issues' }
              ]
            },
            {
              type: 'link',
              label: 'Paper',
              href: `${REPO}/blob/main/paper/paper.pdf`,
              icon: <LoginIcon className="!h-5 !w-[1.125rem] shrink-0" />,
              mobilePresentation: 'icon'
            }
          ]
        } as never}
      />
      <HermesLandingHero content={content} downloads={heroDownloads} />
      <HermesLandingShowcase content={content} />
      <Stats />
      <Statement text="Not every question has one answer. Some have three, and they disagree for reasons that matter." accent={['three,','disagree','matter']} sub="So keep the disagreement." />
      <Boot />
      <Problem />
      <Example />
      <Pipeline />
      <Agents />
      <Cda7 />
      <Graph />
      <Typology />
      <Timeline />
      <Statement text="A benchmark should reward the spread of evidence, not the smoothest sentence." accent={['spread','evidence,']} sub="That is what EVIRAG-Bench measures." />
      <Bench />
      <Metrics />
      <Results />
      <Output />
      <Glossary />
      <Section>
        <Reveal>
        <h2 className="text-[calc(72*var(--u))] leading-none font-light tracking-[0.03em]">
          <Scramble>Ways To Run It</Scramble>
        </h2>
        <p className="hw-mono mt-[calc(24*var(--u))] text-[var(--hw-text-body)] opacity-90">
          A prebuilt binary, the source code, or a local build with Ollama.
        </p>
        </Reveal>
      </Section>
      <HermesLandingPlatforms content={content} downloads={downloads} />
      <HermesLandingFeatures content={content} />
      <section className="bg-white px-[var(--hw-gutter)] py-[calc(120*var(--u))] text-[var(--hw-bg)]">
        <Reveal className="mb-[calc(48*var(--u))]">
        <div className="flex items-end justify-between">
          <h2 className="text-[calc(72*var(--u))] leading-none font-light tracking-[0.03em]">FAQs</h2>
          <Button hierarchy="outline" href={`${REPO}/tree/main/docs`} scale="marketing" surface="white" target="_blank">View docs</Button>
        </div>
        </Reveal>
        <Accordion collapsible type="single">
          {faqs.map(([q, a], i) => (
            <Reveal key={q} delay={i * 70}>
            <AccordionItem surface="white" value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
            </Reveal>
          ))}
        </Accordion>
      </section>
      <div id="runs" className="runs-in"><PricingTiers content={pricing} /></div>
      <HermesLandingPortalFooter content={content} version="Evirag Bench v0.1.0" />
      <SiteFooter />
    </HermesLandingShell>
  )
}

enableTilt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
