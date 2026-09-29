/** Subtle 3D tilt on panels for fine pointers. Event-delegated, so it covers every panel. */
export function enableTilt() {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  let cur: HTMLElement | null = null
  const reset = (el: HTMLElement | null) => { if (el) { el.style.transform = ''; el.classList.remove('tilting') } }
  addEventListener('pointermove', (e) => {
    const t = (e.target as HTMLElement | null)?.closest?.('.panel, .panel-paper') as HTMLElement | null
    if (cur && cur !== t) reset(cur)
    cur = t
    if (!t || t.closest('.terminal')) return
    const r = t.getBoundingClientRect()
    if (r.width > 900) return
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    t.classList.add('tilting')
    t.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateZ(0)`
  }, { passive: true })
  document.addEventListener('pointerleave', () => reset(cur))
}
