import { Badge, Spinner } from '@nous-research/ui'
import { useEffect, useRef, useState } from 'react'
import { AnswerBundle } from './AnswerBundle'

export type Msg = { id: string; role: 'user' | 'assistant'; text: string; kind?: 'answer'; matched?: boolean }
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

function Bubble({ m }: { m: Msg }) {
  if (m.role === 'user') return <div className="chat-row chat-row-user"><div className="chat-bubble-user">{m.text}</div></div>
  return (
    <div className="chat-row">
      <span className="chat-avatar" aria-hidden>E</span>
      <div className="chat-assistant">
        <p>{m.text}</p>
        {m.kind === 'answer' && <AnswerBundle matched={m.matched ?? false} />}
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
            <p>Answers come from a saved run for now. Live answers will go live later.</p>
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
        <p className="chat-foot"><Badge type="outline" surface="blue">Preview</Badge> Answers come from a saved run. Live answers will go live later.</p>
      </div>
    </div>
  )
}

export function makeMessage(role: Msg['role'], text: string, kind?: Msg['kind'], matched?: boolean): Msg {
  return { id: uid(), role, text, kind, matched }
}
