import { MultiSelect, MultiSelectOption } from '@nous-research/ui'
import { useState } from 'react'
import { Reveal } from '../hooks'
import { Chapter, Note } from './parts'

const CAUSES = [
  ['Replication', 'A later attempt repeats the earlier design and fails to recover its finding.', 'A 2010 trial finds an effect. An exact repeat in 2018 finds none.'],
  ['Population', 'The samples, age groups, settings or inclusion criteria differ.', 'Tutoring helps in primary school. The same programme shows no effect at university.'],
  ['Operational', 'Studies define or measure the same named concept differently.', '"Achievement" means test scores in one paper and course grades in another.'],
  ['Methodological', 'The study design, intervention, protocol or control strategy differs.', 'A randomised trial and an observational cohort study the same intervention.'],
  ['Statistical', 'Effect sizes or readings of uncertainty differ despite comparable designs.', 'One team reads a borderline result as no effect; another as a real but small one.'],
  ['Temporal', 'Evidence from a later period differs from earlier evidence.', 'A 2006 conclusion is revised by studies published in 2015.'],
  ['Theoretical', 'Competing causal or explanatory frameworks account for the same observations.', 'One account credits effort, another credits family background, for the same correlation.']
]

export function Cda7() {
  const [open, setOpen] = useState(0)
  const [show, setShow] = useState<string[]>(CAUSES.map((c) => c[0]))
  const list = CAUSES.filter((c) => show.includes(c[0]))
  return (
    <Chapter
      id="cda7"
      no="V. Why sources disagree"
      title="Seven causes, not just 'contradicts'"
      lead="Standard checks stop at labelling two claims as contradictory. CDA-7 goes one step further and records why. A methodological split, a population split and a failed replication call for very different readings."
      paper
    >
      <div className="mb-6 max-w-md">
        <MultiSelect aria-label="Show causes" surface="white" value={show} onValueChange={setShow} placeholder="Filter causes">
          {CAUSES.map((c) => <MultiSelectOption key={c[0]} value={c[0]}>{c[0]}</MultiSelectOption>)}
        </MultiSelect>
      </div>
      <div className="grid gap-3">
        {list.map(([name, meaning, ex], i) => (
          <Reveal key={name} delay={i * 60}>
            <button className={`cda ${open === i ? 'cda-on' : ''}`} onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span className="hw-mono text-xs opacity-60">{String(CAUSES.findIndex((c) => c[0] === name) + 1).padStart(2, '0')}</span>
              <span className="text-[calc(58*var(--u))] leading-none font-light uppercase max-md:text-2xl">{name}</span>
              <span className="cda-plus" aria-hidden>+</span>
              <span className="cda-body">
                <span className="hw-mono block text-[calc(23*var(--u))] leading-[1.6] normal-case max-md:text-sm">{meaning}</span>
                <span className="hw-mono mt-2 block text-[calc(20*var(--u))] leading-[1.6] normal-case opacity-70 max-md:text-xs">Example: {ex}</span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
      <Note>Examples are illustrative, written to show the shape of each cause. The taxonomy is grounded in philosophy-of-science accounts of how scientific disagreements persist. When more than one cause applies, the primary one is stored on the edge and the others are explained in the view.</Note>
    </Chapter>
  )
}
