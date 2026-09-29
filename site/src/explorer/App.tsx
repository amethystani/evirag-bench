import { Badge, BottomSheet, Button, ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, ListItem, Segmented, Switch, useBelowBreakpoint } from '@nous-research/ui'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { chunks, claims, contradictions, meta, REPO, views } from './data'
import { Chat, makeMessage, newConversation, type Conversation } from './Chat'
import { Claims, docsIndex, Docs, Graph, Metrics, Overview, PageTitle, Passages, Time, Views } from './pages'

type Theme = 'signal' | 'ink' | 'sand'
const CHAT_ITEM = { path: '/chat', label: 'Chat', key: '0', icon: '✦' }
const NAV: { group: string; items: { path: string; label: string; key: string; icon: string }[] }[] = [
  { group: 'Saved run', items: [
    { path: '/overview', label: 'Overview', key: '1', icon: '◈' },
    { path: '/views', label: 'Views', key: '2', icon: '▤' },
    { path: '/claims', label: 'Claims', key: '3', icon: '❞' },
    { path: '/graph', label: 'Graph', key: '4', icon: '⌬' },
    { path: '/passages', label: 'Passages', key: '5', icon: '☰' },
    { path: '/time', label: 'Time', key: '6', icon: '◷' }
  ] },
  { group: 'Evidence', items: [
    { path: '/metrics', label: 'Results', key: '7', icon: '▥' },
    { path: '/docs', label: 'Docs', key: '8', icon: '❐' }
  ] },
  { group: 'App', items: [{ path: '/settings', label: 'Settings', key: '9', icon: '⚙' }] }
]
const FLAT = [CHAT_ITEM, ...NAV.flatMap((g) => g.items)]

// hash router
const subscribe = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb) }
const getPath = () => location.hash.replace(/^#/, '') || '/chat'
function useRoute() {
  const path = useSyncExternalStore(subscribe, getPath)
  const go = useCallback((p: string) => { location.hash = p }, [])
  return [path, go] as const
}

function usePref<T extends string | boolean>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); if (s !== null) return (typeof initial === 'boolean' ? s === 'true' : s) as T } catch { /* storage unavailable */ }
    return initial
  })
  const set = useCallback((n: T) => { setV(n); try { localStorage.setItem(key, String(n)) } catch { /* storage unavailable */ } }, [key])
  return [v, set] as const
}

const SAVED_RUN = FLAT.filter((n) => !['/chat', '/settings'].includes(n.path))

function Settings({ theme, setTheme, dense, setDense, reduce, setReduce, clearChats, go }: {
  theme: Theme; setTheme: (t: Theme) => void; dense: boolean; setDense: (b: boolean) => void; reduce: boolean; setReduce: (b: boolean) => void
  clearChats: () => void; go: (p: string) => void
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <PageTitle title="Settings" sub="Preferences are stored in this browser only." />
      <div className="ex-stack">
        <section className="ex-card">
          <p className="ex-label">Appearance</p>
          <Segmented aria-label="Theme" value={theme} onChange={setTheme} options={[{ label: 'Signal', value: 'signal' }, { label: 'Ink', value: 'ink' }, { label: 'Sand', value: 'sand' }]} />
          <label className="ex-switch"><Switch checked={dense} onCheckedChange={setDense} aria-label="Compact layout" /> Compact layout</label>
          <label className="ex-switch"><Switch checked={reduce} onCheckedChange={setReduce} aria-label="Reduce motion" /> Reduce motion</label>
        </section>
        <section className="ex-card">
          <p className="ex-label">Saved run</p>
          <p className="ex-mono">Browse the smoke run that the example answers come from.</p>
          <div className="ex-linkgrid">
            {SAVED_RUN.map((n) => (
              <button key={n.path} className="ex-linkcard" onClick={() => go(n.path)}><span aria-hidden>{n.icon}</span>{n.label}</button>
            ))}
          </div>
        </section>
        <section className="ex-card">
          <p className="ex-label">Data</p>
          <p className="ex-mono">Chats live in this browser. Clearing them cannot be undone.</p>
          <div><Button hierarchy="outline" onClick={() => setConfirm(true)}>Clear chat history</Button></div>
        </section>
        <section className="ex-card">
          <p className="ex-label">About</p>
          <p className="ex-mono">EVIRAG chat preview. Source, docs and issues live in <a href={REPO} target="_blank" rel="noopener noreferrer">the repository</a>. Built with the MIT-licensed @nous-research/ui component library.</p>
          <p className="ex-mono">Press / or Ctrl+K to search chats and pages.</p>
        </section>
      </div>
      <ConfirmDialog open={confirm} title="Clear chat history?" description="All conversations in this browser will be deleted." confirmLabel="Clear" cancelLabel="Cancel" onCancel={() => setConfirm(false)} onConfirm={() => { clearChats(); setConfirm(false) }} />
    </>
  )
}

function Palette({ open, onClose, go, chats, openChat }: { open: boolean; onClose: () => void; go: (p: string) => void; chats: Conversation[]; openChat: (id: string) => void }) {
  const [q, setQ] = useState('')
  const mobile = useBelowBreakpoint(768)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const items: { label: string; hint: string; to: string; chat?: string }[] = [
      ...chats.filter((c) => c.messages.length).map((c) => ({ label: c.title, hint: 'Chat', to: '/chat', chat: c.id })),
      ...FLAT.map((n) => ({ label: n.label, hint: 'Page', to: n.path })),
      ...views.map((v, i) => ({ label: v.position, hint: `View ${i + 1}`, to: '/views' })),
      ...claims.map((c) => ({ label: c.text, hint: `Claim ${c.id}`, to: '/claims' })),
      ...chunks.map((c) => ({ label: c.title, hint: `Passage ${c.id}`, to: '/passages' })),
      ...docsIndex.map((d) => ({ label: d.title, hint: 'Doc', to: '/docs' }))
    ]
    return (s ? items.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(s)) : items.slice(0, 9)).slice(0, 12)
  }, [q, chats])
  const pick = (to: string, chat?: string) => { if (chat) openChat(chat); else go(to); onClose(); setQ('') }
  const body = (
    <div className="ex-palette">
      <Input autoFocus aria-label="Search" placeholder="Search chats and pages" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0].to, results[0].chat) }} surface="white" />
      <div className="ex-palette-list">
        {results.map((r, i) => (
          <ListItem key={i} onClick={() => pick(r.to, r.chat)}>
            <span className="ex-mono">{r.label}</span> <Badge type="outline" surface="white">{r.hint}</Badge>
          </ListItem>
        ))}
        {results.length === 0 && <p className="ex-note">Nothing matches.</p>}
      </div>
    </div>
  )
  return mobile ? (
    <BottomSheet open={open} onClose={onClose} title="Search">{body}</BottomSheet>
  ) : (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Search</DialogTitle><DialogDescription>Jump to anything in this run.</DialogDescription></DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}

export function App() {
  const [path, go] = useRoute()
  const [theme, setTheme] = usePref<Theme>('ex-theme', 'signal')
  const [collapsed, setCollapsed] = usePref<boolean>('ex-collapsed', false)
  const [dense, setDense] = usePref<boolean>('ex-dense', false)
  const [reduce, setReduce] = usePref<boolean>('ex-reduce', false)
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const mobile = useBelowBreakpoint(1024)
  const [chats, setChats] = useState<Conversation[]>(() => {
    try { const raw = localStorage.getItem('ex-chats'); if (raw) { const parsed = JSON.parse(raw) as Conversation[]; if (parsed.length) return parsed } } catch { /* storage unavailable */ }
    return [newConversation()]
  })
  const [activeId, setActiveId] = useState<string>(() => chats[0].id)
  useEffect(() => { try { localStorage.setItem('ex-chats', JSON.stringify(chats.slice(0, 30))) } catch { /* storage unavailable */ } }, [chats])
  const active = chats.find((c) => c.id === activeId) ?? chats[0]
  const startChat = () => {
    const blank = chats.find((c) => c.messages.length === 0)
    if (blank) { setActiveId(blank.id) } else { const c = newConversation(); setChats([c, ...chats]); setActiveId(c.id) }
    go('/chat')
  }
  const removeChat = (id: string) => {
    const rest = chats.filter((c) => c.id !== id)
    const next = rest.length ? rest : [newConversation()]
    setChats(next)
    if (id === activeId) setActiveId(next[0].id)
  }
  const sendMessage = (text: string) => {
    const u = makeMessage('user', text)
    setChats((all) => all.map((c) => c.id === active.id ? { ...c, title: c.messages.length === 0 ? text.slice(0, 48) : c.title, messages: [...c.messages, u] } : c))
    setTimeout(() => {
      const matched = /homework/i.test(text)
      const a = matched
        ? makeMessage('assistant', '', 'answer')
        : makeMessage('assistant', 'Live answers are not available yet, so I cannot answer that question. This chat will go live later. I can show you a worked example of what an answer looks like.', 'notyet')
      setChats((all) => all.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, a] } : c))
    }, 900)
  }

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { document.documentElement.dataset.dense = String(dense); document.documentElement.dataset.reduce = String(reduce) }, [dense, reduce])
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0) }, [path])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [role=dialog]')) return
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') { e.preventDefault(); setSearch(true) }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const current = FLAT.find((n) => path.startsWith(n.path)) ?? FLAT[0]
  const isChat = current.path === '/chat'
  const page = (() => {
    switch (current.path) {
      case '/views': return <Views />
      case '/claims': return <Claims />
      case '/graph': return <Graph />
      case '/passages': return <Passages />
      case '/time': return <Time />
      case '/metrics': return <Metrics />
      case '/docs': return <Docs />
      case '/settings': return <Settings theme={theme} setTheme={setTheme} dense={dense} setDense={setDense} reduce={reduce} setReduce={setReduce} clearChats={() => { const c = newConversation(); setChats([c]); setActiveId(c.id) }} go={go} />
      case '/overview': return <Overview go={go} />
      default: return null
    }
  })()

  const showRail = collapsed && !mobile
  const [filter, setFilter] = useState('')
  const shown = chats.filter((c) => c.messages.length > 0 && c.title.toLowerCase().includes(filter.toLowerCase()))
  const sidebar = (
    <aside className={`ex-sidebar ${showRail ? 'ex-rail' : ''} ${drawer ? 'ex-open' : ''}`} aria-label="Chats">
      <div className="ex-brand">
        <span className="ex-logo">EVIRAG</span>
      </div>
      <button className="ex-newchat" onClick={startChat} title="New chat">
        <span aria-hidden>＋</span>{!showRail && <span>New chat</span>}
      </button>
      {!showRail && (
        <>
          <input className="ex-filter" aria-label="Search chats" placeholder="Search chats" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="ex-history">
            <p className="ex-group-label">Recent</p>
            {shown.map((c) => (
              <div key={c.id} className={`ex-hist ${c.id === active.id && current.path === '/chat' ? 'ex-hist-on' : ''}`}>
                <button onClick={() => { setActiveId(c.id); go('/chat') }} title={c.title}>{c.title}</button>
                <button className="ex-hist-x" onClick={() => removeChat(c.id)} aria-label={`Delete ${c.title}`}>×</button>
              </div>
            ))}
            {shown.length === 0 && <p className="ex-hist-empty">{filter ? 'No chats match.' : 'No chats yet.'}</p>}
          </div>
        </>
      )}
      <div className="ex-side-foot">
        <a href="#/settings" className={`ex-nav ${current.path !== '/chat' ? 'ex-nav-on' : ''}`} title="Settings"><span className="ex-ico" aria-hidden>⚙</span>{!showRail && <span className="ex-nav-label">Settings</span>}</a>
        <a href="../" className="ex-nav" title="Back to the site"><span className="ex-ico" aria-hidden>←</span>{!showRail && <span className="ex-nav-label">Back to site</span>}</a>
      </div>
    </aside>
  )

  return (
    <div className={`ex-app ${showRail ? 'ex-app-rail' : ''}`}>
      {sidebar}
      {drawer && <button className="ex-scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
      <div className="ex-main">
        <header className="ex-top">
          <button className="ex-iconbtn" onClick={() => (mobile ? setDrawer(true) : setCollapsed(!collapsed))} aria-label={mobile ? 'Open chats' : 'Toggle sidebar'}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><rect x="2" y="3" width="14" height="12" rx="2.5" /><path d="M7 3v12" /></svg>
          </button>
          {isChat ? (
            <span className="ex-model">EVIRAG <i>Preview</i></span>
          ) : (
            <>
              <a className="ex-back" href="#/chat">← Chat</a>
              <span className="ex-model">{current.label}</span>
            </>
          )}
        </header>
        {isChat ? (
          <main className="ex-chatmain" key={active.id}><Chat conv={active} onSend={sendMessage} onExample={() => setChats((all) => all.map((c) => c.id === active.id ? { ...c, messages: [...c.messages, makeMessage('assistant', 'Worked example: “Does homework improve academic achievement?”', 'answer')] } : c))} /></main>
        ) : (
          <main className="ex-content" key={current.path}><div className="ex-page surface-white" data-surface="white">{page}</div></main>
        )}
      </div>
      <Palette open={search} onClose={() => setSearch(false)} go={go} chats={chats} openChat={(id) => { setActiveId(id); go('/chat') }} />
    </div>
  )
}
