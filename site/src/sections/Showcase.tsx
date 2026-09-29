import { useEffect, useRef, useState } from 'react'
import { runChecks, tensions } from '../explorer/checks'
import { ClaimGraph } from '../explorer/ClaimGraph'
import { savedRun } from '../explorer/data'

// Our own walkthrough of the chat, built from the real interface and the real saved run.
const Q = savedRun.question
type Phase = 0 | 1 | 2 | 3 | 4 | 5 // typing, searching, reading, comparing, answer, graph
const STAGE: Record<number, string> = { 1: 'Searching the bundled abstracts', 2: 'Reading passage 3 of 6', 3: 'Comparing claims 5 of 12' }
const STEP_OF = (p: Phase) => (p <= 1 ? 0 : p <= 3 ? 1 : 2)
const STEPS = [['1', 'Ask', 'Type a question people disagree about.'], ['2', 'Compare', 'Claims from each source are checked against each other.'], ['3', 'Read', 'Positions, causes and the claim graph, with sources.']]

const yearOf = (source: string) => savedRun.chunks.find((c) => c.id === source)?.year
const cite = (sources: string[]) => [...new Set(sources.map((s) => `${s.split(':')[0]}${yearOf(s) ? `, ${yearOf(s)}` : ''}`))].join(' · ')

export function Showcase() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<Phase>(0)
  const [typed, setTyped] = useState(0)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reduce) { setPhase(5); setTyped(Q.length); return }
    if (!visible) return
    const dead = { v: false }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      while (!dead.v) {
        setPhase(0); setTyped(0)
        await sleep(500)
        for (let i = 1; i <= Q.length && !dead.v; i++) { setTyped(i); await sleep(34) }
        await sleep(450)
        for (const p of [1, 2, 3] as Phase[]) { if (dead.v) return; setPhase(p); await sleep(1000) }
        if (dead.v) return
        setPhase(4); await sleep(4200)
        if (dead.v) return
        setPhase(5); await sleep(4600)
      }
    })()
    return () => { dead.v = true }
  }, [visible, reduce])

  const direct = tensions(savedRun).some((t) => t.direct > 0)
  const checks = runChecks(savedRun)
  const step = STEP_OF(phase)

  return (
    <section ref={ref} id="how" className="show px-[var(--hw-gutter)] py-[calc(110*var(--u))] max-md:px-5 max-md:py-14">
      <p className="hw-mono show-kicker">How it works</p>
      <h2 className="show-title">Ask. Compare. Read the disagreement.</h2>

      <div className="show-frame" role="img" aria-label="Animated walkthrough of the EVIRAG chat: a question is asked, sources are compared, and separate positions appear with a claim graph.">
        <div className="show-bar">
          <span className="show-dots" aria-hidden><i /><i /><i /></span>
          <span className="show-url">amethystani.github.io/evirag-bench/explorer</span>
        </div>
        <div className="show-body">
          <div className="show-thread">
            {phase >= 1 && <div className="show-user">{Q}</div>}
            {phase >= 1 && phase <= 3 && (
              <div className="show-row"><i className="show-av">E</i><span className="show-status"><b className="show-spin" aria-hidden />{STAGE[phase]}</span></div>
            )}
            {phase >= 4 && (
              <div className="show-row">
                <i className="show-av">E</i>
                <div className="show-card">
                  <div className="show-tabs" aria-hidden>
                    <span className={phase === 4 ? 'on' : ''}>Positions</span>
                    <span className={phase === 5 ? 'on' : ''}>Graph</span>
                  </div>
                  {phase === 4 ? (
                    <div className="show-answer">
                      <p className="show-lead">{direct ? `The sources disagree, so this answer keeps ${savedRun.views.length} positions apart instead of blending them into one.` : `These sources report ${savedRun.views.length} different findings.`}</p>
                      <ol className="show-pos">
                        {savedRun.views.map((v) => <li key={v.position}><span>{v.position}</span><em>{cite(v.sources)}</em></li>)}
                      </ol>
                      <ul className="show-checks">
                        {checks.slice(0, 4).map((c) => <li key={c.label} className={c.ok ? 'ok' : 'warn'}><b aria-hidden>{c.ok ? '✓' : '!'}</b>{c.label}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div className="show-graph"><ClaimGraph run={savedRun} compact /></div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="show-composer">
            <span>{phase === 0 ? Q.slice(0, typed) : 'Ask a question that scientists disagree about'}{phase === 0 && <b className="show-caret" aria-hidden />}</span>
            <i aria-hidden>↑</i>
          </div>
        </div>
      </div>

      <ol className="show-steps">
        {STEPS.map(([n, t, d], i) => (
          <li key={n} className={i === step ? 'on' : ''}><b>{n}</b><div><h3>{t}</h3><p>{d}</p></div></li>
        ))}
      </ol>

      <div className="show-actions">
        <a className="cta" href="explorer/">Open the chat</a>
        <a className="show-link" href="https://github.com/amethystani/evirag-bench/blob/main/paper/paper.pdf" target="_blank" rel="noopener noreferrer">Read the paper</a>
      </div>
    </section>
  )
}
