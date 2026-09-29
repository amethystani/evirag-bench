import { useEffect, useRef, useState } from 'react'

/** Oscilloscope: three views as separate waveforms, or one averaged trace. */
export function Scope() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'rag' | 'evirag'>('evirag')
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const d = Math.min(1.5, devicePixelRatio || 1)
      canvas.width = r.width * d
      canvas.height = r.height * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const waves = [
      { f: 1.0, p: 0, a: 0.8, c: '#edff45' },
      { f: 1.7, p: 2.1, a: 0.6, c: '#ffffff' },
      { f: 2.6, p: 4.0, a: 0.7, c: '#ff9fb2' }
    ]
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      const w = canvas.clientWidth, h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,.14)'
      ctx.lineWidth = 1
      for (let x = 0; x <= w; x += w / 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y <= h; y += h / 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      const time = reduce ? 0 : t / 1000
      const yv = (wave: typeof waves[0], x: number) => Math.sin((x / w) * Math.PI * 2 * wave.f * 2 + wave.p + time * wave.f * 1.4) * wave.a
      const trace = (fn: (x: number) => number, color: string, width: number) => {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 3) {
          const y = h / 2 - fn(x) * (h * 0.36)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0
      }
      if (modeRef.current === 'evirag') waves.forEach((wv) => trace((x) => yv(wv, x), wv.c, 2))
      else trace((x) => waves.reduce((s, wv) => s + yv(wv, x), 0) / waves.length, '#ffffff', 3)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [])

  return (
    <div className="panel scope">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="panel-label !mb-0">Signal view</p>
        <div className="flex gap-2">
          <button className={`seg ${mode === 'rag' ? 'seg-on' : ''}`} onClick={() => setMode('rag')}>Averaged</button>
          <button className={`seg ${mode === 'evirag' ? 'seg-on' : ''}`} onClick={() => setMode('evirag')}>Preserved</button>
        </div>
      </div>
      <canvas ref={ref} className="scope-canvas" role="img" aria-label="Oscilloscope showing three signals, or their average" />
      <p className="hw-mono text-[calc(21*var(--u))] leading-[1.6] normal-case max-md:text-xs">
        {mode === 'rag'
          ? 'Average three different signals and the peaks cancel. What remains is a flat, confident-looking line.'
          : 'Keep the three signals apart and every distinct shape is still visible.'}
      </p>
    </div>
  )
}
