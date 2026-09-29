import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented, SelectCard, SelectCardGroup } from '@nous-research/ui'
import { useState } from 'react'
import { Chapter, Note } from './parts'

// Topics from the paper's five domains; CR gains are the per-domain improvements over vanilla RAG.
const DOMAINS = [
  { id: 'education', name: 'Education', q: 'Does homework improve achievement?', gain: 0.18, kind: 'bipolar', queries: 250 },
  { id: 'biomedicine', name: 'Biomedicine', q: 'Do statins help in primary prevention?', gain: 0.16, kind: 'multi-factorial', queries: 250 },
  { id: 'economics', name: 'Economics', q: 'Does raising the minimum wage reduce employment?', gain: 0.2, kind: 'bipolar', queries: 250 },
  { id: 'earth', name: 'Earth sciences', q: 'How strong are the climate feedbacks?', gain: 0.16, kind: 'multi-factorial', queries: 250 },
  { id: 'nutrition', name: 'Nutrition', q: 'How do dietary fats relate to cardiovascular risk?', gain: 0.16, kind: 'multi-factorial', queries: 250 }
]

export function Explore() {
  const [id, setId] = useState('education')
  const [tab, setTab] = useState<'question' | 'result'>('question')
  const d = DOMAINS.find((x) => x.id === id)!
  return (
    <Chapter
      id="explore"
      no="Explore"
      title="Five domains, five live arguments"
      lead="Pick a domain. Each one is a body of literature where credible papers reach different conclusions, which is exactly where a single fluent answer misleads."
      paper
    >
      <SelectCardGroup value={id} onValueChange={setId} surface="white" className="grid gap-3 md:grid-cols-5">
        {DOMAINS.map((x) => (
          <SelectCard key={x.id} value={x.id} title={x.name} description={`${x.queries} queries`} />
        ))}
      </SelectCardGroup>

      <div className="mt-8 flex items-center gap-4">
        <Segmented aria-label="Detail" value={tab} onChange={setTab} options={[{ label: 'The question', value: 'question' }, { label: 'The result', value: 'result' }]} />
      </div>

      <div key={id + tab} className="fade-swap mt-6">
        <Card className="!bg-transparent">
          <CardHeader>
            <Badge type="outline" surface="white">{d.name}</Badge>
            <CardTitle className="mt-3 text-[calc(70*var(--u))] max-md:text-2xl">{tab === 'question' ? d.q : `+${d.gain.toFixed(3)} contradiction recall`}</CardTitle>
            <CardDescription>
              {tab === 'question'
                ? `One of the topics in the ${d.name.toLowerCase()} slice of the benchmark. A system that answers with one paragraph hides how divided the field is.`
                : `Improvement over vanilla RAG in the paper's per-domain results. Gains were larger where the controversy is bipolar (${d.kind === 'bipolar' ? 'this domain' : 'economics and education'}) than in multi-factorial domains.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="hw-mono text-[calc(21*var(--u))] normal-case max-md:text-xs">Controversy shape here: <b>{d.kind}</b>. No domain reverses: EVIRAG has the highest contradiction recall in all five.</p>
          </CardContent>
        </Card>
      </div>
      <Note>The five domains together hold 989 papers and 1,250 benchmark queries, 250 per domain.</Note>
    </Chapter>
  )
}
