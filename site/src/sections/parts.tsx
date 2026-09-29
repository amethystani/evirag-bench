import { Reveal } from '../hooks'

export function Chapter({ id, no, title, lead, paper = false, children }: {
  id: string; no: string; title: string; lead?: string; paper?: boolean; children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`chapter ${paper ? 'chapter-paper' : ''} px-[var(--hw-gutter)] py-[calc(140*var(--u))] max-md:px-5 max-md:py-20`}
    >
      <Reveal>
        <p className="hw-mono text-[var(--hw-text-eyebrow)] tracking-[0.12em] uppercase opacity-70 max-md:text-xs">{no}</p>
        <h2 className="mt-[calc(18*var(--u))] max-w-[calc(1500*var(--u))] text-[calc(120*var(--u))] leading-[0.95] font-light tracking-[0.02em] uppercase max-md:text-5xl">{title}</h2>
        {lead && <p className="hw-mono mt-[calc(36*var(--u))] max-w-[calc(1200*var(--u))] text-[calc(26*var(--u))] leading-[1.55] normal-case max-md:text-sm">{lead}</p>}
      </Reveal>
      <div className="mt-[calc(90*var(--u))] max-md:mt-10">{children}</div>
    </section>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="hw-mono mt-8 max-w-[calc(1200*var(--u))] text-[calc(21*var(--u))] leading-[1.6] normal-case opacity-75 max-md:text-xs">{children}</p>
}

export function Tag({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>
}
