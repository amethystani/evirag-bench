import { useEffect, useRef } from 'react'

/** Big statement whose words light up as you scroll, over a drifting particle field. */
export function Statement({ text, accent = [], sub }: { text: string; accent?: string[]; sub?: string }) {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = text.split(' ')

  // word-by-word light up, driven by scroll position
  useEffect(() => {
    const el = root.current
    if (!el) return
    const spans = [...el.querySelectorAll<HTMLElement>('[data-w]')]
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = innerHeight
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.55 + r.height * 0.35)))
      const lit = p * spans.length
      spans.forEach((s, i) => { s.style.opacity = String(0.16 + 0.84 * Math.min(1, Math.max(0, lit - i))) })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // particle field: three drifting clusters, repelled by the pointer
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = false
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(cv)
    let w = 0, h = 0
    const resize = () => {
      const r = cv.getBoundingClientRect()
      const d = Math.min(2, devicePixelRatio || 1)
      w = r.width; h = r.height
      cv.width = w * d; cv.height = h * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    const COLORS = ['#edff45', '#ffffff', '#ff9fb2']
    const N = matchMedia('(max-width: 768px)').matches ? 42 : 78
    const pts = Array.from({ length: N }, (_, i) => ({ g: i % 3, x: Math.random(), y: Math.random(), vx: 0, vy: 0, a: Math.random() * 6.28 }))
    const mouse = { x: -999, y: -999 }
    const move = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top }
    addEventListener('pointermove', move)
    let raf = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      ctx.clearRect(0, 0, w, h)
      const time = reduce ? 0 : t / 1000
      const centers = [0, 1, 2].map((g) => ({
        x: w * (0.2 + 0.3 * g) + Math.cos(time * 0.25 + g * 2.1) * w * 0.07,
        y: h * (0.35 + 0.15 * (g % 2)) + Math.sin(time * 0.3 + g * 1.7) * h * 0.12
      }))
      for (const p of pts) {
        const c = centers[p.g]
        p.a += 0.004
        const tx = c.x + Math.cos(p.a * 3 + p.x * 9) * w * 0.11
        const ty = c.y + Math.sin(p.a * 2 + p.y * 9) * h * 0.2
        p.vx += (tx - (p.x * w)) * 0.0006
        p.vy += (ty - (p.y * h)) * 0.0006
        const px = p.x * w, py = p.y * h
        const dx = px - mouse.x, dy = py - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < 9000) { const k = (9000 - d2) / 9000 * 0.6; p.vx += (dx / Math.sqrt(d2 + 1)) * k; p.vy += (dy / Math.sqrt(d2 + 1)) * k }
        p.vx *= 0.94; p.vy *= 0.94
        p.x = Math.min(1.05, Math.max(-0.05, p.x + p.vx / w))
        p.y = Math.min(1.05, Math.max(-0.05, p.y + p.vy / h))
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]
          if (a.g !== b.g) continue
          const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h
          const d = Math.hypot(dx, dy)
          if (d < 110) {
            ctx.strokeStyle = COLORS[a.g]
            ctx.globalAlpha = (1 - d / 110) * 0.5
            ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      for (const p of pts) { ctx.fillStyle = COLORS[p.g]; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2.4, 0, 6.28); ctx.fill() }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener('pointermove', move) }
  }, [])

  return (
    <section ref={root} className="statement" aria-label={text}>
      <canvas ref={canvas} className="statement-field" aria-hidden />
      <p className="statement-text" aria-hidden>
        {words.map((w, i) => (
          <span key={i} data-w className={accent.includes(w.replace(/[.,]/g, '')) ? 'accent' : ''}>{w} </span>
        ))}
      </p>
      {sub && <p className="hw-mono statement-sub">{sub}</p>}
    </section>
  )
}
