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
  PricingTiers
} from '@nous-research/ui'
import type { HermesLandingContent, HermesLandingDownloads, HermesPricingContent } from '@nous-research/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const REPO = 'https://github.com/amethystani/evirag-bench'
const V = 'v0.1.0'
const asset = (target: string) => `${REPO}/releases/download/${V}/evirag-bench-${V}-${target}.tar.gz`

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

const content: HermesLandingContent = {
  ...base,
  downloadLabel: 'Download the binary',
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
    unixCommand: `cargo install --git ${REPO}`,
    widthAnchor: `cargo install --git ${REPO}`,
    windowsCommand: `cargo install --git ${REPO}`
  },
  platforms: [
    { detail: 'Apple silicon', match: ['Mac'], os: 'mac', title: 'Mac OS' },
    { detail: 'Build from source', match: ['Win'], os: 'windows', title: 'Windows' },
    { detail: 'x86_64', match: ['Linux', 'X11'], os: 'linux', title: 'Linux' }
  ],
  portal: {
    body: 'Disagreement-Aware Scientific Retrieval-Augmented Generation. Mishra, Sharma and Khetarpaul.',
    cta: 'Read the paper',
    eyebrow: 'Beyond Epistemic Collapse',
    href: `${REPO}/blob/main/paper/paper.pdf`,
    title: 'The Paper'
  }
}

const downloads: HermesLandingDownloads = {
  mac: { direct: true, href: asset('aarch64-apple-darwin') },
  linux: { direct: true, href: asset('x86_64-unknown-linux-gnu') },
  windows: { direct: false, href: `${REPO}#ii-quickstart` }
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

function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-[var(--hw-gutter)] pt-[calc(60*var(--u))]">{children}</div>
}

function App() {
  return (
    <HermesLandingShell>
      <HermesLandingScroll />
      <FilmGrain />
      <HermesHeader
        nav={{
          beforeLogo: [
            { type: 'link', label: 'Install', href: '#install' },
            { type: 'link', label: 'Demo', href: 'demo/' }
          ],
          afterLogo: [
            { type: 'link', label: 'Docs', href: `${REPO}/tree/main/docs` },
            { type: 'link', label: 'Paper', href: `${REPO}/blob/main/paper/paper.pdf` }
          ]
        } as never}
      />
      <HermesLandingHero content={content} downloads={downloads} />
      <HermesLandingShowcase content={content} />
      <Section>
        <h2 className="text-[calc(72*var(--u))] leading-none font-light tracking-[0.03em]">
          Evirag Bench
        </h2>
        <p className="hw-mono mt-[calc(24*var(--u))] text-[var(--hw-text-body)] opacity-90">
          Available on macOS and Linux.
        </p>
      </Section>
      <HermesLandingPlatforms content={content} downloads={downloads} />
      <HermesLandingFeatures content={content} />
      <section className="bg-white px-[var(--hw-gutter)] py-[calc(120*var(--u))] text-[var(--hw-bg)]">
        <div className="mb-[calc(48*var(--u))] flex items-end justify-between">
          <h2 className="text-[calc(72*var(--u))] leading-none font-light tracking-[0.03em]">FAQs</h2>
          <Button hierarchy="outline" href={`${REPO}/tree/main/docs`} scale="marketing" surface="white" target="_blank">View docs</Button>
        </div>
        <Accordion collapsible type="single">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} surface="white" value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <PricingTiers content={pricing} />
      <HermesLandingPortalFooter content={content} version="Evirag Bench v0.1.0" />
    </HermesLandingShell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
