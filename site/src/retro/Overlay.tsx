import { useEffect, useRef, useState } from 'react'

const CHAPTERS: [string, string][] = [
  ['problem', 'I'], ['example', 'II'], ['pipeline-detail', 'III'], ['agents', 'IV'], ['cda7', 'V'], ['graph', 'VI'],
  ['controversy', 'VII'], ['benchmark', 'VIII'], ['metrics', 'IX'], ['results', 'X'], ['output', 'XI'], ['glossary', 'XII']
]

/** CRT scanlines, scroll telemetry, chapter rail and a crosshair that follows the pointer. */
export function Overlay() {
  const [pct, setPct] = useState(0)
  const [active, setActive] = useState('')
  const cross = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return
    const el = cross.current
    if (!el) return
    const move = (e: PointerEvent) => { el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; el.style.opacity = '1' }
    addEventListener('pointermove', move)
    return () => removeEventListener('pointermove', move)
  }, [])

  return (
    <>
      <div className="crt" aria-hidden />
      <div className="scanbar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
      <div className="telemetry hw-mono" aria-hidden>SCAN {String(Math.round(pct)).padStart(3, '0')}%</div>
      <nav className="rail" aria-label="Chapters">
        {CHAPTERS.map(([id, n]) => (
          <a key={id} href={`#${id}`} className={active === id ? 'rail-on' : ''} aria-label={`Chapter ${n}`}><span>{n}</span></a>
        ))}
      </nav>
      <div ref={cross} className="cross" aria-hidden><i /><i /></div>
    </>
  )
}
