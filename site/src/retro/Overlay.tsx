import { useEffect, useRef, useState } from 'react'

const CHAPTERS: [string, string][] = [
  ['problem', 'I'], ['example', 'II'], ['pipeline-detail', 'III'], ['agents', 'IV'], ['cda7', 'V'], ['graph', 'VI'],
  ['controversy', 'VII'], ['benchmark', 'VIII'], ['metrics', 'IX'], ['results', 'X'], ['output', 'XI'], ['glossary', 'XII']
]

/** Scroll telemetry and a chapter rail. */
export function Overlay() {
  const [active, setActive] = useState('')
  const bar = useRef<HTMLElement>(null)
  const label = useRef<HTMLDivElement>(null)

  // Update the bar and label straight in the DOM, once per frame, so scrolling never triggers a React render.
  useEffect(() => {
    let raf = 0
    const paint = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - innerHeight
      const pct = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${pct / 100})`
      if (label.current) label.current.textContent = `SCAN ${String(Math.round(pct)).padStart(3, '0')}%`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    paint()
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
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
      <div className="scanbar" aria-hidden><i ref={bar as React.RefObject<HTMLElement>} /></div>
      <div ref={label} className="telemetry hw-mono" aria-hidden>SCAN 000%</div>
      <nav className="rail" aria-label="Chapters">
        {CHAPTERS.map(([id, n]) => (
          <a key={id} href={`#${id}`} className={active === id ? 'rail-on' : ''} aria-label={`Chapter ${n}`}><span>{n}</span></a>
        ))}
      </nav>
    </>
  )
}
