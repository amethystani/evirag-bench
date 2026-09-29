import { Badge, Button } from '@nous-research/ui'
import { useEffect, useState } from 'react'

const KEY = 'evirag-paper-note'
const PAPER = 'https://github.com/amethystani/evirag-bench/blob/main/paper/paper.pdf'

/** A floating notification card. Appears after a moment, and stays dismissed once closed. */
export function Announcement() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(KEY) === '1' } catch { /* storage unavailable */ }
    if (dismissed) return
    const id = setTimeout(() => setShow(true), 2600)
    return () => clearTimeout(id)
  }, [])

  const close = () => {
    setShow(false)
    try { localStorage.setItem(KEY, '1') } catch { /* storage unavailable */ }
  }

  if (!show) return null
  return (
    <aside className="note" role="status" aria-label="Announcement">
      <button className="note-x" onClick={close} aria-label="Dismiss">×</button>
      <Badge type="outline" surface="white">New</Badge>
      <h3 className="note-title">Beyond Epistemic Collapse</h3>
      <p className="note-body">The EVIRAG paper is in the repository, alongside the benchmark and the code.</p>
      <div className="note-actions">
        <Button hierarchy="primary" surface="white" href={PAPER} target="_blank" rel="noopener noreferrer">Read the paper</Button>
        <button className="note-later" onClick={close}>Not now</button>
      </div>
    </aside>
  )
}
