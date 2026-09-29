import run from '../smoke_run.json'
import { useInView } from '../hooks'
import { Chapter, Note } from '../sections/parts'

export function Timeline() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4)
  const curve = Object.entries(run.temporal_curve as unknown as Record<string, [number, number]>)
  const max = Math.max(...curve.flatMap(([, v]) => v), 1)
  return (
    <Chapter
      id="time"
      no="Time"
      title="Evidence has a date"
      lead="Stage 5 counts claims and contradiction links per publication year. A dispute that was sharp in 2006 and eased by 2015 reads very differently from one that is still growing."
    >
      <div ref={ref} className="panel">
        <p className="panel-label">Saved smoke run: claims and contradiction links per year</p>
        <div className="timeline">
          {curve.map(([year, [claims, links]]) => (
            <div key={year} className="timeline-col">
              <div className="timeline-bars">
                <i style={{ height: seen ? `${(claims / max) * 100}%` : '0%', background: '#fff' }}><b>{claims}</b></i>
                <i style={{ height: seen ? `${(links / max) * 100}%` : '0%', background: '#ff6b6b', transitionDelay: '.2s' }}><b>{links}</b></i>
              </div>
              <span className="hw-mono text-sm">{year}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-5 hw-mono text-xs uppercase">
          <span><i className="dot" style={{ background: '#fff' }} /> Claims</span>
          <span><i className="dot" style={{ background: '#ff6b6b' }} /> Contradiction links</span>
        </div>
      </div>
      <Note>Two publication years from a two-passage fixture, so the curve is tiny. On a real corpus it shows how disagreement builds or fades.</Note>
    </Chapter>
  )
}
