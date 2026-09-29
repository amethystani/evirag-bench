import { useEffect, useRef, useState } from 'react'
import { useInView } from '../hooks'

type Step = { t: 'cmd'; text: string } | { t: 'out'; lines: string[]; ms?: number } | { t: 'wait'; ms: number }

// Commands and output taken from real runs of this repository.
const SESSION: Step[] = [
  { t: 'cmd', text: 'git clone https://github.com/amethystani/evirag-bench && cd evirag-bench' },
  { t: 'out', lines: ["Cloning into 'evirag-bench'...", 'done.'], ms: 260 },
  { t: 'cmd', text: './scripts/smoke.sh' },
  { t: 'out', lines: ['smoke_001: 2 retrieved passages', '1 gold queries valid'], ms: 380 },
  { t: 'wait', ms: 500 },
  { t: 'cmd', text: "jq -r '.views[].position' runs/smoke.jsonl" },
  {
    t: 'out', ms: 300,
    lines: [
      'More homework does not consistently improve achievement.',
      'Homework practice is associated with higher achievement in mathematics.',
      'Observational design cannot rule out family support as a confounder.'
    ]
  },
  { t: 'cmd', text: "jq '.edges | map(select(.label==\"contradicts\")) | length' runs/smoke.jsonl" },
  { t: 'out', lines: ['6'], ms: 200 },
  { t: 'wait', ms: 2600 }
]

const PROMPT = 'animesh@mac evirag-bench %'
const LAST_LOGIN = 'Last login: Tue Sep 29 22:14:07 on ttys001'

export function MacTerminal() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  const [rows, setRows] = useState<{ kind: 'sys' | 'prompt' | 'out'; text: string }[]>([{ kind: 'sys', text: LAST_LOGIN }])
  const [typing, setTyping] = useState<string | null>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!seen) return
    let dead = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    ;(async () => {
      while (!dead) {
        setRows([{ kind: 'sys', text: LAST_LOGIN }])
        for (const s of SESSION) {
          if (dead) return
          if (s.t === 'cmd') {
            await sleep(reduce ? 0 : 450)
            let cur = ''
            for (const ch of s.text) {
              if (dead) return
              cur += ch
              setTyping(cur)
              if (!reduce) await sleep(26 + Math.random() * 30)
            }
            await sleep(reduce ? 0 : 260)
            setRows((r) => [...r, { kind: 'prompt', text: s.text }])
            setTyping(null)
          } else if (s.t === 'out') {
            for (const line of s.lines) {
              if (dead) return
              await sleep(reduce ? 0 : s.ms ?? 200)
              setRows((r) => [...r, { kind: 'out', text: line }])
            }
          } else {
            await sleep(s.ms)
          }
        }
        if (reduce) return
      }
    })()
    return () => { dead = true }
  }, [seen])

  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight }, [rows, typing])

  return (
    <section className="px-[var(--hw-gutter)] py-[calc(80*var(--u))] max-md:px-5" aria-label="Terminal session">
      <div ref={ref} className="mac-window">
        <div className="mac-titlebar">
          <div className="mac-lights" aria-hidden><i className="r" /><i className="y" /><i className="g" /></div>
          <span className="mac-title">animesh — evirag-bench — zsh — 92×24</span>
        </div>
        <div ref={body} className="mac-body" role="img" aria-label="Terminal running the smoke test and printing three views">
          {rows.map((r, i) => (
            r.kind === 'prompt'
              ? <div key={i}><span className="mac-prompt">{PROMPT}</span> {r.text}</div>
              : <div key={i} className={r.kind === 'sys' ? 'mac-dim' : ''}>{r.text}</div>
          ))}
          <div><span className="mac-prompt">{PROMPT}</span> {typing ?? ''}<span className="mac-cursor" /></div>
        </div>
      </div>
    </section>
  )
}
