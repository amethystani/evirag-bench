import { Input, Separator } from '@nous-research/ui'
import { useState } from 'react'
import { Reveal } from '../hooks'
import { Chapter } from './parts'

const G = [
  ['RAG', 'Retrieval-augmented generation: fetch documents, then have a language model answer from them.'],
  ['Epistemic collapse', 'Compressing structured, multi-view evidence into a single response.'],
  ['Atomic claim', 'One checkable statement extracted from a passage and linked to it.'],
  ['Signed graph', 'A graph whose links are positive (support) or negative (contradict).'],
  ['Louvain', 'A community-detection method. The signed version groups claims that support within and oppose across.'],
  ['CDA-7', 'The seven-cause taxonomy for why two sources disagree.'],
  ['ED', 'Epistemic Divergence: how far apart the view centroids sit.'],
  ['PI', 'Polarization Index: how sharply the conflict separates into opposed camps.'],
  ['Skeptic agent', 'The retrieval agent whose only goal is to find dissent, null results and critiques.'],
  ['Confidence tier', 'High, medium or low, derived from evidence structure rather than fluency.']
]

export function Glossary() {
  const [q, setQ] = useState('')
  const list = G.filter(([t, d]) => (t + ' ' + d).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Chapter id="glossary" no="XII. Glossary" title="Terms in plain words">
      <div className="mb-8 max-w-md">
        <Input aria-label="Search the glossary" placeholder="Search terms" value={q} onChange={(e) => setQ(e.target.value)} surface="blue" />
      </div>
      <div className="grid gap-x-[calc(80*var(--u))] gap-y-2 md:grid-cols-2">
        {list.map(([t, d], i) => (
          <Reveal key={t} delay={(i % 2) * 90}>
            <div className="gloss">
              <h3 className="text-[calc(46*var(--u))] leading-none font-light uppercase max-md:text-2xl">{t}</h3>
              <p className="hw-mono mt-2 text-[calc(21*var(--u))] leading-[1.6] normal-case opacity-85 max-md:text-xs">{d}</p>
            </div>
          </Reveal>
        ))}
        {list.length === 0 && <p className="hw-mono normal-case opacity-70">No term matches "{q}".</p>}
      </div>
      <Separator className="mt-10 opacity-30" />
    </Chapter>
  )
}
