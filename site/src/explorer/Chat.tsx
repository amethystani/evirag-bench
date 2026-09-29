import { Badge, BadgeGroup, Spinner } from '@nous-research/ui'
import { useEffect, useRef, useState } from 'react'
import { views } from './data'

export type Msg = { id: string; role: 'user' | 'assistant'; text: string; kind?: 'soon' }
export type Conversation = { id: string; title: string; messages: Msg[] }

export const SUGGESTIONS = [
  'Does homework improve academic achievement?',
  'Do statins help in primary prevention?',
  'Does raising the minimum wage reduce employment?',
  'How strong are the climate feedbacks?',
  'How do dietary fats relate to cardiovascular risk?'
]

const uid = () => Math.random().toString(36).slice(2, 10)
export const newConversation = (): Conversation => ({ id: uid(), title: 'New chat', messages: [] })

function ExampleAnswer() {
  return (
    <div className="chat-example" aria-label="Example of the answer format">
      <p className="chat-example-label">Example of the format, from the saved smoke run</p>
      <div className="chat-views">
        {views.map((v, i) => (
          <article key={v.position} className="chat-view">
            <p className="chat-view-no">View {i + 1}</p>
            <h4>{v.position}</h4>
            <p className="chat-view-sum">{v.summary}</p>
            <BadgeGroup surface="blue" type="outline">
              <BadgeGroup.Item>{v.confidence_tier} confidence</BadgeGroup.Item>
              {v.disagreement_causes.map((c) => <BadgeGroup.Item key={c}>{c}</BadgeGroup.Item>)}
            </BadgeGroup>
          </article>
        ))}
      </div>
    </div>
  )
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === 'user') return <div className="chat-row chat-row-user"><div className="chat-bubble-user">{m.text}</div></div>
  return (
    <div className="chat-row">
      <span className="chat-avatar" aria-hidden>E</span>
      <div className="chat-assistant">
        <p>{m.text}</p>
        {m.kind === 'soon' && (
          <>
            <p className="chat-soft">Live answers are not connected yet. This chat will go live later. When it does, each question will come back as separate views like the ones below, each with its own evidence, weaknesses, sources and confidence.</p>
            <ExampleAnswer />
          </>
        )}
      </div>
    </div>
  )
}

export function Chat({ conv, onSend }: { conv: Conversation; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(''); setPending(false) }, [conv.id])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv.messages.length, pending])
  useEffect(() => {
    const a = areaRef.current
    if (!a) return
    a.style.height = 'auto'
    a.style.height = Math.min(a.scrollHeight, 200) + 'px'
  }, [draft])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || pending) return
    onSend(t)
    setDraft('')
    setPending(true)
    setTimeout(() => setPending(false), 900)
  }

  const empty = conv.messages.length === 0
  return (
    <div className="chat">
      <div className="chat-scroll">
        {empty ? (
          <div className="chat-empty">
            <span className="chat-avatar chat-avatar-lg" aria-hidden>E</span>
            <h1>Ask about a contested question</h1>
            <p>A preview of the EVIRAG chat. Live answers will be connected later.</p>
            <div className="chat-chips">
              {SUGGESTIONS.map((s) => <button key={s} className="chat-chip" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        ) : (
          <div className="chat-thread">
            {conv.messages.map((m) => <Bubble key={m.id} m={m} />)}
            {pending && (
              <div className="chat-row"><span className="chat-avatar" aria-hidden>E</span><div className="chat-assistant chat-typing"><Spinner /> Thinking</div></div>
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
        <p className="chat-foot"><Badge type="outline" surface="blue">Preview</Badge> Chat is not live yet. Answers will appear here when it goes live.</p>
      </div>
    </div>
  )
}

export function makeMessage(role: Msg['role'], text: string, kind?: Msg['kind']): Msg {
  return { id: uid(), role, text, kind }
}
