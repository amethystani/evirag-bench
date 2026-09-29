import { Fragment } from 'react'

/** Small markdown renderer for the repository docs: headings, paragraphs, lists, tables, code and inline emphasis. */
function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="md-code">{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>
    return <Fragment key={i}>{p}</Fragment>
  })
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(<pre key={key++} className="md-pre">{buf.join('\n')}</pre>)
    } else if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length
      const text = line.replace(/^#+\s*/, '')
      const Tag = (`h${Math.min(level + 1, 4)}`) as 'h2' | 'h3' | 'h4'
      out.push(<Tag key={key++} className="md-h">{inline(text)}</Tag>)
      i++
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      out.push(
        <div key={key++} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{rows[0].map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    } else if (/^(\d+\.|-|\*)\s/.test(line)) {
      const ordered = /^\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^(\d+\.|-|\*)\s/.test(lines[i])) items.push(lines[i++].replace(/^(\d+\.|-|\*)\s+/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      out.push(<Tag key={key++} className="md-list">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</Tag>)
    } else if (line.trim() === '') {
      i++
    } else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|```|\||(\d+\.|-|\*)\s)/.test(lines[i])) buf.push(lines[i++])
      out.push(<p key={key++} className="md-p">{inline(buf.join(' '))}</p>)
    }
  }
  return <div className="md">{out}</div>
}
