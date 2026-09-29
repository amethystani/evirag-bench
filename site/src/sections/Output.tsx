import { BottomSheet, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Spinner, Tabs, TabsList, TabsPanel, TabsTrigger, useBelowBreakpoint } from '@nous-research/ui'
import { useState } from 'react'
import run from '../smoke_run.json'
import { useInView } from '../hooks'
import { Chapter, Note } from './parts'

const LINES = [
  '{',
  '  "question": "Does homework improve academic achievement?",',
  '  "controversy_class": "polarized",',
  '  "views": [{',
  '    "position": "…one checkable position…",',
  '    "summary": "…evidence with passage citations…",',
  '    "weaknesses": "…limits of the evidence…",',
  '    "disagreement_causes": ["methodological"],',
  '    "sources": ["edu_a:0:0", "edu_b:0:0"],',
  '    "confidence_tier": "low"',
  '  }],',
  '  "claims": [ … ],  "edges": [ … ],',
  '  "temporal_curve": { "2006": [5, 6], "2015": [3, 6] }',
  '}'
]

const FIELDS: [string, string][] = [
  ['Position', 'One checkable claim per view.'],
  ['Weaknesses', 'Stated up front, not buried.'],
  ['Disagreement causes', 'Why this view conflicts with the others.'],
  ['Sources', 'Passage IDs that resolve in the record.'],
  ['Confidence tier', 'Set by the evidence structure, not the prose.'],
  ['Temporal curve', 'Claims and contradictions per year.']
]

function Record() {
  return <pre className="code modal-code">{JSON.stringify(run, null, 2)}</pre>
}

export function Output() {
  const [ref, seen] = useInView<HTMLPreElement>(0.3)
  const [open, setOpen] = useState(false)
  const mobile = useBelowBreakpoint(768)
  const typed = seen
  return (
    <Chapter
      id="output"
      no="XI. What you get back"
      title="An answer you can check"
      lead="Every run writes one JSON record. Each view carries its own provenance, and every source ID resolves to a retrieved passage, so a reader can go from a statement straight to the text it came from."
      paper
    >
      <Tabs defaultValue="record">
        {(active, setActive) => (
          <div>
            <TabsList variant="command">
              <TabsTrigger variant="command" active={active === 'record'} value="record" onClick={() => setActive('record')}>Record</TabsTrigger>
              <TabsTrigger variant="command" active={active === 'fields'} value="fields" onClick={() => setActive('fields')}>Fields</TabsTrigger>
            </TabsList>
            <TabsPanel active={active === 'record'} value="record" className="mt-6">
              <div className="grid gap-[calc(70*var(--u))] md:grid-cols-[1.2fr_1fr] max-md:gap-8">
                <pre ref={ref} className="code">
                  {LINES.map((l, i) => (
                    <span key={i} className="code-line" style={{ opacity: typed ? 1 : 0, transform: typed ? 'none' : 'translateX(-12px)', transitionDelay: `${i * 110}ms` }}>{l}{'\n'}</span>
                  ))}
                </pre>
                <div className="flex flex-col items-start gap-5">
                  <p className="hw-mono flex items-center gap-2 text-[calc(22*var(--u))] normal-case max-md:text-sm"><Spinner className="text-lg" /> Real output from the saved smoke run.</p>
                  <Button hierarchy="primary" scale="marketing" onClick={() => setOpen(true)}>Open the full record</Button>
                </div>
              </div>
            </TabsPanel>
            <TabsPanel active={active === 'fields'} value="fields" className="mt-6">
              <ul className="hw-mono grid gap-4 text-[calc(23*var(--u))] leading-[1.6] normal-case md:grid-cols-2 max-md:text-sm">
                {FIELDS.map(([t, d]) => <li key={t} className="panel-paper"><b>{t}.</b> {d}</li>)}
              </ul>
            </TabsPanel>
          </div>
        )}
      </Tabs>

      {mobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Full record"><Record /></BottomSheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Full record</DialogTitle>
              <DialogDescription>The complete JSON written by one run of the smoke fixture.</DialogDescription>
            </DialogHeader>
            <Record />
          </DialogContent>
        </Dialog>
      )}
      <Note>The same record also stores atomic claims, graph edges, retrieved passages, model names and a readable answer template. The layout is documented in docs/output.md.</Note>
    </Chapter>
  )
}
