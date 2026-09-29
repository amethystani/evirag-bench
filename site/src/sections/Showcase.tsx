import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { runChecks, tensions } from '../explorer/checks'
import { savedRun } from '../explorer/data'
import './answer.css'

// The heavy tab components (charts, graph) load only once the demo scrolls into view.
const TabView = lazy(() => import('../explorer/AnswerBundle').then((m) => ({ default: m.TabView })))

// Our own walkthrough of the chat, built from the real interface and the real saved run.
const Q = savedRun.question
type Tab = 'positions' | 'graph' | 'conflicts' | 'diff' | 'sources' | 'time'
const TABS: [Tab, string, number][] = [
  ['positions', 'Positions', 4200], ['graph', 'Graph', 3800], ['conflicts', 'Conflicts', 5200],
  ['diff', 'Vs vanilla', 5200], ['sources', 'Sources', 4400], ['time', 'Time', 3600]
]
const STAGE = ['Searching the bundled abstracts', 'Reading passage 3 of 6', 'Comparing claims 5 of 12']
const STEPS = [['1', 'Ask', 'Type a question people disagree about.'], ['2', 'Compare', 'Claims from each source are checked against each other.'], ['3', 'Read', 'Positions, conflicts, the claim graph, sources and time, all linked to the papers.']]
const yearOf = (source: string) => savedRun.chunks.find((c) => c.id === source)?.year
const cite = (sources: string[]) => [...new Set(sources.map((s) => `${s.split(':')[0]}${yearOf(s) ? `, ${yearOf(s)}` : ''}`))].join(' · ')

export function Showcase() {
  const ref = useRef<HTMLDivElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [stage, setStage] = useState(-1)      // -1 typing, 0..2 stages, 3 answer
  const [tab, setTab] = useState<Tab>('positions')
  const [typed, setTyped] = useState(0)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reduce) { setStage(3); setTab('positions'); setTyped(Q.length); return }
    if (!visible) return
    const dead = { v: false }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      while (!dead.v) {
        setStage(-1); setTyped(0); setTab('positions')
        await sleep(500)
        for (let i = 1; i <= Q.length && !dead.v; i++) { setTyped(i); await sleep(34) }
        await sleep(450)
        for (let s = 0; s < 3; s++) { if (dead.v) return; setStage(s); await sleep(1000) }
        for (const [t, , ms] of TABS) { if (dead.v) return; setStage(3); setTab(t); await sleep(ms) }
      }
    })()
    return () => { dead.v = true }
  }, [visible, reduce])

  // When a tab is taller than the window, scroll it slowly so the whole thing is shown.
  useEffect(() => {
    const el = thread.current
    if (!el || stage < 3 || reduce) return
    el.scrollTop = 0
    const id = setTimeout(() => {
      const max = el.scrollHeight - el.clientHeight
      if (max > 6) el.scrollTo({ top: max, behavior: 'smooth' })
    }, 900)
    return () => clearTimeout(id)
  }, [tab, stage, reduce])

  const direct = tensions(savedRun).some((t) => t.direct > 0)
  const checks = runChecks(savedRun)
  const step = stage < 0 ? 0 : stage < 3 ? 1 : 2

  return (
    <section ref={ref} id="how" className="show px-[var(--hw-gutter)] py-[calc(110*var(--u))] max-md:px-5 max-md:py-14">
      <p className="hw-mono show-kicker">How it works</p>
      <h2 className="show-title">Ask. Compare. Read the disagreement.</h2>

      <div className="show-frame" role="img" aria-label="Animated walkthrough of the EVIRAG chat: a question is asked, sources are compared, and the answer is shown as positions, a claim graph, conflicts, a comparison with a single answer, sources and a timeline.">
        <div className="show-bar">
          <span className="show-dots" aria-hidden><i /><i /><i /></span>
          <span className="show-url">amethystani.github.io/evirag-bench/explorer</span>
        </div>
        <div className="show-body">
          <div ref={thread} className="show-thread">
            {stage >= 0 && <div className="show-user">{Q}</div>}
            {stage >= 0 && stage < 3 && (
              <div className="show-row"><i className="show-av">E</i><span className="show-status"><b className="show-spin" aria-hidden />{STAGE[stage]}</span></div>
            )}
            {stage === 3 && (
              <div className="show-row">
                <i className="show-av">E</i>
                <div className="show-card">
                  <div className="show-tabs" aria-hidden>
                    {TABS.map(([t, label]) => <span key={t} className={t === tab ? 'on' : ''}>{label}</span>)}
                  </div>
                  <div key={tab} className="show-panel">
                    {tab === 'positions' ? (
                      <div className="show-answer">
                        <p className="show-lead">{direct ? `The sources disagree, so this answer keeps ${savedRun.views.length} positions apart instead of blending them into one.` : `These sources report ${savedRun.views.length} different findings.`}</p>
                        <ol className="show-pos">
                          {savedRun.views.map((v) => <li key={v.position}><span>{v.position}</span><em>{cite(v.sources)}</em></li>)}
                        </ol>
                        <ul className="show-checks">
                          {checks.map((c) => <li key={c.label} className={c.ok ? 'ok' : 'warn'}><b aria-hidden>{c.ok ? '✓' : '!'}</b>{c.label}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <div className="show-tabview">
                        <Suspense fallback={<p className="show-status" style={{ padding: 16 }}>Loading…</p>}><TabView run={savedRun} tab={tab} /></Suspense>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="show-composer">
            <span>{stage < 0 ? Q.slice(0, typed) : 'Ask a question that scientists disagree about'}{stage < 0 && <b className="show-caret" aria-hidden />}</span>
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
