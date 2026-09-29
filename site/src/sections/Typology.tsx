import { useState } from 'react'
import { Chapter, Note } from './parts'

const CLASSES = [
  { id: 'resolved', name: 'Resolved', rule: 'ED < 0.15, PI < 0.3', conf: 'high', queries: 190, text: 'Sources largely agree. A short, source-grounded answer is enough.', x: 0, w: 0.15, y: 0, h: 0.3, c: '#9df0b5' },
  { id: 'emerging', name: 'Emerging', rule: '0.15 ≤ ED < 0.35, PI < 0.4', conf: 'medium', queries: 335, text: 'Views are beginning to separate, but conflict is not sharp.', x: 0.15, w: 0.2, y: 0, h: 0.4, c: '#ffe08a' },
  { id: 'stable', name: 'Stable', rule: 'ED ≥ 0.35, PI < 0.4', conf: 'medium', queries: 445, text: 'Several distinct views coexist without splitting into opposed camps.', x: 0.35, w: 0.25, y: 0, h: 0.4, c: '#9fd8ff' },
  { id: 'polarized', name: 'Polarized', rule: 'ED ≥ 0.35, PI ≥ 0.4', conf: 'low', queries: 280, text: 'Evidence splits into opposed clusters. Confidence stays low by design.', x: 0.35, w: 0.25, y: 0.4, h: 0.2, c: '#ff9fb2' }
]
const W = 480, H = 300, PAD = 40
const sx = (v: number) => PAD + (v / 0.6) * (W - PAD - 10)
const sy = (v: number) => H - PAD - (v / 0.6) * (H - PAD - 10)

export function Typology() {
  const [sel, setSel] = useState('polarized')
  const cur = CLASSES.find((c) => c.id === sel)!
  return (
    <Chapter
      id="controversy"
      no="VII. How contested is it?"
      title="Confidence follows the shape of the evidence"
      lead="Two numbers describe the retrieved evidence. Epistemic Divergence (ED) is how far apart the views sit. Polarization Index (PI) is how sharply they split into opposed camps. Together they place a question in one of four classes."
      paper
    >
      <div className="grid gap-[calc(70*var(--u))] md:grid-cols-[1.2fr_1fr] max-md:gap-8">
        <div className="panel-paper">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="ED versus PI plane with four regions">
            {CLASSES.map((c) => (
              <rect key={c.id} x={sx(c.x)} y={sy(c.y + c.h)} width={sx(c.x + c.w) - sx(c.x)} height={sy(c.y) - sy(c.y + c.h)}
                fill={c.c} opacity={sel === c.id ? 0.95 : 0.45} stroke="#0000f2" strokeWidth={sel === c.id ? 3 : 1}
                style={{ cursor: 'pointer', transition: 'opacity .3s' }} onClick={() => setSel(c.id)} onMouseEnter={() => setSel(c.id)} />
            ))}
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="13" fill="#0000f2" fontFamily="Courier Prime, monospace">Epistemic Divergence (ED) →</text>
            <text x="12" y={H / 2} fontSize="13" fill="#0000f2" fontFamily="Courier Prime, monospace" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">Polarization (PI) →</text>
            {CLASSES.map((c) => (
              <text key={c.id + 't'} x={sx(c.x + c.w / 2)} y={sy(c.y + c.h / 2)} textAnchor="middle" fontSize="13" fontFamily="Courier Prime, monospace" fontWeight="700" fill="#0000f2" pointerEvents="none">{c.name.toUpperCase()}</text>
            ))}
          </svg>
        </div>
        <div key={cur.id} className="panel-paper fade-swap self-start">
          <p className="panel-label">{cur.rule}</p>
          <h3 className="text-[calc(96*var(--u))] leading-none font-light uppercase max-md:text-4xl">{cur.name}</h3>
          <p className="hw-mono mt-4 text-[calc(24*var(--u))] leading-[1.6] normal-case max-md:text-sm">{cur.text}</p>
          <p className="hw-mono mt-5 text-[calc(22*var(--u))] uppercase max-md:text-xs">Confidence tier: <b>{cur.conf}</b></p>
          <p className="hw-mono mt-2 text-[calc(22*var(--u))] uppercase max-md:text-xs">Benchmark queries: <b>{cur.queries}</b></p>
        </div>
      </div>
      <Note>Thresholds were chosen by inspecting a 25-query pilot and checked for stability under ±0.05 perturbation. The class is what sets how confidently an answer is presented.</Note>
    </Chapter>
  )
}
