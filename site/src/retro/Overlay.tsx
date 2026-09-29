import { useEffect, useState } from 'react'

const CHAPTERS: [string, string][] = [
  ['problem', 'I'], ['example', 'II'], ['pipeline-detail', 'III'], ['agents', 'IV'], ['cda7', 'V'], ['graph', 'VI'],
  ['controversy', 'VII'], ['benchmark', 'VIII'], ['metrics', 'IX'], ['results', 'X'], ['output', 'XI'], ['glossary', 'XII']
]

/** Scroll telemetry and a chapter rail. */
export function Overlay() {
  const [pct, setPct] = useState(0)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      setPct(max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0)
    }
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = CHAPTERS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
    }, { rootMargin: '-45% 0px -45% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="scanbar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <div className="telemetry hw-mono" aria-hidden>SCAN {String(Math.round(pct)).padStart(3, '0')}%</div>
      <nav className="rail" aria-label="Chapters">
        {CHAPTERS.map(([id, n]) => (
          <a key={id} href={`#${id}`} className={active === id ? 'rail-on' : ''} aria-label={`Chapter ${n}`}><span>{n}</span></a>
        ))}
      </nav>
    </>
  )
}
