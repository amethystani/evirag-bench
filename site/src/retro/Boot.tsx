import { useEffect, useState } from 'react'
import { useInView } from '../hooks'

const LINES = [
  '> EVIRAG BENCH v0.1.0',
  '> LOADING CORPUS ............. 989 PAPERS',
  '> INDEXING PASSAGES .......... 43,155 CHUNKS',
  '> EXTRACTING CLAIMS .......... 63,955 ATOMIC CLAIMS',
  '> BUILDING SIGNED GRAPH ...... OK',
  '> ATTRIBUTING CAUSES ......... CDA-7',
  '> DISAGREEMENT PRESERVED ..... YES'
]

export function Boot() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(LINES.join('\n').length); return }
    const total = LINES.join('\n').length
    const id = setInterval(() => setN((v) => { if (v >= total) { clearInterval(id); return v } return v + 2 }), 28)
    return () => clearInterval(id)
  }, [seen])
  const text = LINES.join('\n').slice(0, n)
  const done = n >= LINES.join('\n').length
  return (
    <section className="px-[var(--hw-gutter)] py-[calc(60*var(--u))] max-md:px-5" aria-label="System boot log">
      <div ref={ref} className="terminal">
        <div className="terminal-bar"><i /><i /><i /><span className="hw-mono">evirag://boot</span></div>
        <pre className="hw-mono">{text}<b className={done ? 'caret caret-idle' : 'caret'}>█</b></pre>
      </div>
    </section>
  )
}
