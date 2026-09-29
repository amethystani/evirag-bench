import { Badge, Spinner } from '@nous-research/ui'
import { useEffect, useRef, useState } from 'react'
import { AnswerBundle } from './AnswerBundle'
import { savedRun, type RunData } from './data'

export type Msg = { id: string; role: 'user' | 'assistant'; text: string; kind?: 'answer' | 'notyet'; run?: RunData }
export type Conversation = { id: string; title: string; messages: Msg[] }

export const EXAMPLE_QUESTION = 'Does homework improve academic achievement?'
export const DOMAINS = ['Education', 'Biomedicine', 'Economics', 'Earth sciences', 'Nutrition']

const uid = () => Math.random().toString(36).slice(2, 10)
export const newConversation = (): Conversation => ({ id: uid(), title: 'New chat', messages: [] })

function Bubble({ m, onExample }: { m: Msg; onExample: () => void }) {
  if (m.role === 'user') return <div className="chat-row chat-row-user"><div className="chat-bubble-user">{m.text}</div></div>
  return (
    <div className="chat-row">
      <span className="chat-avatar" aria-hidden>E</span>
      <div className="chat-assistant">
        {m.text && <p>{m.text}</p>}
        {m.kind === 'answer' && <AnswerBundle run={m.run ?? savedRun} />}
        {m.kind === 'notyet' && <button className="chat-action" onClick={onExample}>See a worked example</button>}
      </div>
    </div>
  )
}

export function Chat({ conv, onSend, onExample, working, onCancel, devicePanel, deviceReady }: { conv: Conversation; onSend: (text: string) => void; onExample: () => void; working?: string | null; onCancel?: () => void; devicePanel?: React.ReactNode; deviceReady?: boolean }) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(''); setPending(false) }, [conv.id])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv.messages.length, pending, working])
  useEffect(() => {
    const a = areaRef.current
    if (!a) return
    a.style.height = 'auto'
    a.style.height = Math.min(a.scrollHeight, 200) + 'px'
  }, [draft])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || pending || working) return
    onSend(t)
    setDraft('')
    if (!deviceReady) { setPending(true); setTimeout(() => setPending(false), 900) }
  }

  const empty = conv.messages.length === 0
  return (
    <div className="chat">
      <div className="chat-scroll">
        {empty ? (
          <div className="chat-empty">
            <span className="chat-avatar chat-avatar-lg" aria-hidden>E</span>
            <h1>Ask about a contested question</h1>
            <p>EVIRAG keeps the disagreement between scientific sources instead of blending it into one answer.</p>
            {devicePanel}
            <button className="chat-chip chat-chip-main" onClick={() => send(EXAMPLE_QUESTION)}>
              <span className="chat-chip-tag">{deviceReady ? 'Try it' : 'Worked example'}</span>
              {EXAMPLE_QUESTION}
            </button>
            <p className="chat-domains">{deviceReady ? `Ask about ${DOMAINS.join(', ')}.` : `Live answers will go live later, across ${DOMAINS.join(', ')}.`}</p>
          </div>
        ) : (
          <div className="chat-thread">
            {conv.messages.map((m) => <Bubble key={m.id} m={m} onExample={onExample} />)}
            {(pending || working) && (
              <div className="chat-row"><span className="chat-avatar" aria-hidden>E</span><div className="chat-assistant chat-typing"><Spinner /> {working ?? 'Thinking'}{working && onCancel ? <button className="chat-cancel" onClick={onCancel}>Stop</button> : null}</div></div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="chat-composer-wrap">
        <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
          <textarea
            ref={areaRef}
            rows={1}
            value={draft}
            placeholder="Ask a question that scientists disagree about"
            aria-label="Message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) } }}
          />
          <button type="submit" className="chat-send" disabled={!draft.trim() || pending} aria-label="Send">↑</button>
        </form>
        <p className="chat-foot"><Badge type="outline" surface="blue">{deviceReady ? 'On-device' : 'Preview'}</Badge> {deviceReady ? 'A very small model answers from 45 openly licensed abstracts. Check important claims against the sources.' : 'Only the worked example is answered for now. Live answers will go live later.'}</p>
      </div>
    </div>
  )
}

export function makeMessage(role: Msg['role'], text: string, kind?: Msg['kind'], run?: RunData): Msg {
  return { id: uid(), role, text, kind, run }
}
