import { DropdownMenu, FitText, Poster, Separator, Toast, useGpuTier, useToast, Watchlist } from '@nous-research/ui'
import { Reveal } from '../hooks'

const FitTextAny = FitText as unknown as React.ComponentType<Record<string, unknown>>
const REPO = 'https://github.com/amethystani/evirag-bench'
const BIBTEX = `@inproceedings{mishra2026evirag,
  title     = {Beyond Epistemic Collapse: Disagreement-Aware Scientific Retrieval-Augmented Generation},
  author    = {Mishra, Animesh and Sharma, Krishang and Khetarpaul, Sonia},
  booktitle = {Proceedings of EMNLP},
  year      = {2026}
}`

type Cite = 'menu' | 'bibtex' | 'cff' | 'pdf'

export function Finale() {
  const tier = useGpuTier()
  const { toast, showToast } = useToast(2400)

  const onCite = (v: Cite) => {
    if (v === 'bibtex') {
      navigator.clipboard?.writeText(BIBTEX).then(() => showToast('BibTeX copied', 'success'), () => showToast('Could not copy', 'error'))
    } else if (v === 'cff') window.open(`${REPO}/blob/main/CITATION.cff`, '_blank', 'noopener')
    else if (v === 'pdf') window.open(`${REPO}/blob/main/paper/paper.pdf`, '_blank', 'noopener')
  }

  return (
    <section id="finale" className="px-[var(--hw-gutter)] pt-[calc(120*var(--u))] pb-[calc(60*var(--u))] max-md:px-5 max-md:pt-16">
      <Reveal>
        <div className="grid items-center gap-[calc(70*var(--u))] md:grid-cols-[1fr_1.1fr] max-md:gap-8">
          <div className="poster-wrap">
            {tier >= 2 ? (
              <Poster variant="vibe" aspect="landscape" autoPlay="gentle" signature="Evirag" cornerMarks border />
            ) : (
              <div className="poster-static"><span className="hw-mono">Evirag</span></div>
            )}
          </div>
          <div>
            <p className="hw-mono text-[var(--hw-text-eyebrow)] tracking-[0.12em] uppercase opacity-70 max-md:text-xs">The paper</p>
            <h2 className="mt-3 text-[calc(96*var(--u))] leading-[0.98] font-light uppercase max-md:text-4xl">Beyond Epistemic Collapse</h2>
            <p className="hw-mono mt-5 text-[calc(24*var(--u))] leading-[1.6] normal-case max-md:text-sm">
              Disagreement-aware scientific retrieval-augmented generation. Animesh Mishra, Krishang Sharma and Sonia Khetarpaul.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a className="cta" href={`${REPO}/blob/main/paper/paper.pdf`} target="_blank" rel="noopener noreferrer">Read the paper</a>
              <DropdownMenu<Cite>
                value="menu"
                onChange={onCite}
                direction="down"
                options={[
                  { label: 'Cite', value: 'menu' },
                  { label: 'Copy BibTeX', value: 'bibtex' },
                  { label: 'Citation file', value: 'cff' },
                  { label: 'PDF', value: 'pdf' }
                ]}
              />
            </div>
          </div>
        </div>
      </Reveal>

      <Separator className="my-[calc(100*var(--u))] opacity-30 max-md:my-12" />

      <div className="grid gap-[calc(70*var(--u))] md:grid-cols-2 max-md:gap-10">
        <div>
          <p className="panel-label">Read next</p>
          <Watchlist
            scramble
            items={[
              { label: 'Output format', right: 'docs/output.md', url: `${REPO}/blob/main/docs/output.md` },
              { label: 'CDA-7 guide', right: 'docs/cda7.md', url: `${REPO}/blob/main/docs/cda7.md` },
              { label: 'Annotation protocol', right: 'docs/annotation.md', url: `${REPO}/blob/main/docs/annotation.md` },
              { label: 'Run settings', right: 'docs/run-settings.md', url: `${REPO}/blob/main/docs/run-settings.md` }
            ]}
          />
        </div>
        <div>
          <p className="panel-label">Take part</p>
          <Watchlist
            items={[
              { label: 'Contribute', right: 'CONTRIBUTING.md', url: `${REPO}/blob/main/CONTRIBUTING.md` },
              { label: 'Open issues', right: 'GitHub', url: `${REPO}/issues` },
              { label: 'Discussions', right: 'GitHub', url: `${REPO}/discussions` },
              { label: 'Releases', right: 'v0.1.0', url: `${REPO}/releases` }
            ]}
          />
        </div>
      </div>

      <div className="mt-[calc(120*var(--u))] max-md:mt-14">
        <FitTextAny as="p" className="fit-wordmark" min="2rem" max="22rem">Keep the disagreement</FitTextAny>
      </div>
      <Toast toast={toast} />
    </section>
  )
}
