import {
  createHermesLandingContent,
  Footer,
  HermesHeader,
  HermesLandingFeatures,
  HermesLandingPortalFooter,
  HermesLandingScroll,
  HermesLandingShell,
  HermesLandingHero
} from '@nous-research/ui'
import type { HermesLandingContent, HermesLandingDownloads } from '@nous-research/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const REPO = 'https://github.com/amethystani/evirag-bench'
const art = (file: string) => `art/${file}`

const base = createHermesLandingContent()

const content: HermesLandingContent = {
  ...base,
  assets: {
    ...base.assets,
    badge: art('lamp.jpg'),
    nousLogo: art('lamp.jpg'),
    footerGirl: { poster: art('lighthouse.jpg'), stackedSrc: '', webmSrc: '' }
  },
  downloadLabel: 'Download the binary',
  features: [
    { index: '#1 Retrieve', title: 'Four Roles', image: art('riders.jpg'),
      body: 'Precision, recall, skeptic and counterfactual retrieval passes, so the evidence pool is not one-sided before generation starts.' },
    { index: '#2 Extract', title: 'Atomic Claims', image: art('flow.jpg'),
      body: 'Every passage is broken into checkable claims that stay linked to their document, chunk and year.' },
    { index: '#3 Explain', title: 'Why Sources Disagree', image: art('castle.jpg'),
      body: 'Each contradiction gets a CDA-7 cause: replication, population, operational, methodological, statistical, temporal or theoretical.' },
    { index: '#4 Partition', title: 'Signed Louvain', image: art('lamp.jpg'),
      body: 'Support and contradiction edges are partitioned into communities, so each position is a group of claims rather than a single quote.' },
    { index: '#5 Trace', title: 'Temporal Evidence', image: art('mountains.jpg'),
      body: 'Claims and contradiction links are counted per year, showing whether a dispute is emerging, stable or settling.' },
    { index: '#6 Answer', title: 'Source-Linked Views', image: art('penguins.jpg'),
      body: 'Each view has a position, evidence summary, weaknesses, disagreement causes, passage IDs and a confidence tier.' }
  ],
  footer: {
    legal: [
      { href: `${REPO}/blob/main/LICENSE`, label: 'License' },
      { href: `${REPO}/blob/main/CITATION.cff`, label: 'Cite' }
    ],
    license: 'MIT License &bull; 2026',
    org: 'EVIRAG'
  },
  hero: {
    art: art('flow.jpg'),
    background: art('riders.jpg'),
    eyebrow: 'Open Source &bull; MIT License',
    titleLines: ['Retrieval', 'That Keeps', 'The Debate']
  },
  install: {
    anchor: '#install',
    label: 'Install via terminal',
    unixCommand: `cargo install --git ${REPO}`,
    widthAnchor: `cargo install --git ${REPO}`,
    windowsCommand: `cargo install --git ${REPO}`
  },
  portal: {
    eyebrow: 'Paper',
    title: 'Beyond Epistemic Collapse',
    body: 'Disagreement-Aware Scientific Retrieval-Augmented Generation. Mishra, Sharma and Khetarpaul.',
    cta: 'Read the paper',
    href: `${REPO}/blob/main/paper/paper.pdf`
  }
}

const release = `${REPO}/releases/latest`
const downloads: HermesLandingDownloads = {
  mac: { direct: false, href: release },
  linux: { direct: false, href: release },
  windows: { direct: false, href: REPO }
}

function App() {
  return (
    <HermesLandingShell>
      <HermesLandingScroll />
      <HermesHeader
        brand={<span style={{ fontFamily: 'var(--font-display)', letterSpacing: '.04em' }}>EVIRAG</span>}
        brandHref="#"
        nav={{
          beforeLogo: [
            { type: 'link', label: 'Paper', href: `${REPO}/blob/main/paper/paper.pdf` },
            { type: 'link', label: 'Demo', href: 'demo/' }
          ],
          afterLogo: [{ type: 'link', label: 'GitHub', href: REPO }]
        } as never}
      />
      <HermesLandingHero content={content} downloads={downloads} />
      <HermesLandingFeatures content={content} />
      <HermesLandingPortalFooter content={content} version="0.1.0" />
    </HermesLandingShell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
