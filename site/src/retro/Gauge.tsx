import { useAutoStep } from '../hooks'

const TIERS = [
  { name: 'high', deg: 60, cls: 'Resolved', note: 'Sources agree.' },
  { name: 'medium', deg: 0, cls: 'Emerging or stable', note: 'Views differ, without sharp opposition.' },
  { name: 'low', deg: -60, cls: 'Polarized', note: 'Evidence splits into opposed camps.' }
]

export function Gauge() {
  const { ref, step, pick } = useAutoStep(TIERS.length, 3000)
  const t = TIERS[step]
  return (
    <div ref={ref} className="panel-paper">
      <p className="panel-label">Confidence dial</p>
      <svg viewBox="0 0 240 140" className="mx-auto w-full max-w-[22rem]" role="img" aria-label={`Dial pointing to ${t.name} confidence`}>
        <path d="M 30 120 A 90 90 0 0 1 210 120" fill="none" stroke="#0000f2" strokeOpacity=".25" strokeWidth="14" strokeLinecap="round" />
        <path d="M 30 120 A 90 90 0 0 1 90 40" fill="none" stroke="#ff9fb2" strokeWidth="14" strokeLinecap="round" />
        <path d="M 96 37 A 90 90 0 0 1 144 37" fill="none" stroke="#ffe08a" strokeWidth="14" />
        <path d="M 150 40 A 90 90 0 0 1 210 120" fill="none" stroke="#9df0b5" strokeWidth="14" strokeLinecap="round" />
        <g style={{ transformOrigin: '120px 120px', transform: `rotate(${t.deg}deg)`, transition: 'transform 1.1s cubic-bezier(.3,1.5,.5,1)' }}>
          <line x1="120" y1="120" x2="120" y2="42" stroke="#0000f2" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="120" cy="120" r="8" fill="#0000f2" />
        <text x="26" y="138" fontSize="9" fontFamily="Courier Prime, monospace" fill="#0000f2">LOW</text>
        <text x="106" y="24" fontSize="9" fontFamily="Courier Prime, monospace" fill="#0000f2">MED</text>
        <text x="196" y="138" fontSize="9" fontFamily="Courier Prime, monospace" fill="#0000f2">HIGH</text>
      </svg>
      <div className="mt-2 flex justify-center gap-2">
        {TIERS.map((x, i) => <button key={x.name} className={`seg ${i === step ? 'seg-on' : ''}`} onClick={() => pick(i)}>{x.name}</button>)}
      </div>
      <p className="hw-mono mt-3 text-center text-[13px] normal-case"><b>{t.cls}.</b> {t.note}</p>
    </div>
  )
}
