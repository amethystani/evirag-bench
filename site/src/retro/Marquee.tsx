export function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const row = [...items, ...items]
  return (
    <div className="marquee" aria-hidden>
      <div className={`marquee-row ${reverse ? 'marquee-rev' : ''}`}>
        {row.map((t, i) => <span key={i}>{t}<em>✦</em></span>)}
      </div>
    </div>
  )
}
