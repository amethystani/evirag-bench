import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { Claim, Edge, RunData, View } from '../data'
import { dot, embed, retrieve } from './retrieve'
import { generate } from './llm'

export type Progress = (stage: string) => void
export { Cancelled } from './config'
import { Cancelled } from './config'

const CAUSES = ['replication', 'population', 'operational', 'methodological', 'statistical', 'temporal', 'theoretical']
const clean = (s: string) => s.replace(/^[\s\-*\d.)]+/, '').replace(/\s+/g, ' ').trim()

async function extractClaims(engine: WebWorkerMLCEngine, question: string, text: string) {
  const out = await generate(
    engine,
    'You extract factual claims from scientific abstracts. Be literal. Do not add anything the abstract does not say.',
    `Abstract:\n${text.slice(0, 1400)}\n\nQuestion of interest: ${question}\n\nList 2 or 3 short, standalone factual claims from this abstract that bear on the question. One claim per line, no numbering, no extra text.`,
    140
  )
  return out.split('\n').map(clean).filter((c) => c.length >= 25 && c.length <= 260).slice(0, 3)
}

async function labelPair(engine: WebWorkerMLCEngine, a: string, b: string): Promise<'supports' | 'contradicts' | 'neutral'> {
  const out = (await generate(
    engine,
    'You compare two claims from different scientific papers.',
    `Claim A: ${a}\nClaim B: ${b}\n\nDo these claims agree with each other, disagree with each other, or are they unrelated? Answer with exactly one word: agree, disagree, or unrelated.`,
    4
  )).toLowerCase()
  if (out.includes('disagree') || out.includes('contradict')) return 'contradicts'
  if (out.includes('agree') || out.includes('support')) return 'supports'
  return 'neutral'
}

async function labelCause(engine: WebWorkerMLCEngine, a: string, b: string): Promise<string | null> {
  const out = (await generate(
    engine,
    'You explain why two scientific claims disagree.',
    `Claim A: ${a}\nClaim B: ${b}\n\nThese claims disagree. What is the main reason?\n- replication: a repeat of the study failed to reproduce it\n- population: different people, ages or settings\n- operational: the same concept is measured differently\n- methodological: different study design or controls\n- statistical: uncertainty or effect size read differently\n- temporal: different time periods\n- theoretical: competing explanations\nAnswer with exactly one word from the list.`,
    5
  )).toLowerCase()
  return CAUSES.find((c) => out.includes(c)) ?? null
}

function cluster(claims: Claim[], vecs: Float32Array[], edges: Edge[]) {
  const idx = new Map(claims.map((c, i) => [c.id, i]))
  let groups: number[][] = claims.map((_, i) => [i])
  const conflicts = (x: number[], y: number[]) => edges.some((e) => e.label === 'contradicts' && ((x.includes(idx.get(e.source)!) && y.includes(idx.get(e.target)!)) || (y.includes(idx.get(e.source)!) && x.includes(idx.get(e.target)!))))
  const sim = (x: number[], y: number[]) => { let s = 0; for (const i of x) for (const j of y) s += dot(vecs[i], vecs[j] as Float32Array); return s / (x.length * y.length) }
  for (;;) {
    let bi = -1, bj = -1, bs = 0.55
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const s = sim(groups[i], groups[j])
      if (s > bs && !conflicts(groups[i], groups[j])) { bs = s; bi = i; bj = j }
    }
    if (bi < 0) break
    groups = groups.filter((_, k) => k !== bi && k !== bj).concat([[...groups[bi], ...groups[bj]]])
  }
  return groups
}

export async function runPipeline(engine: WebWorkerMLCEngine, question: string, model: string, onStage: Progress, signal: AbortSignal): Promise<RunData | { notCovered: true; best: number }> {
  const t0 = performance.now()
  const stop = () => { if (signal.aborted) throw new Cancelled() }

  onStage('Searching the bundled abstracts')
  const r = await retrieve(question)
  stop()
  if (!r.chunks) return { notCovered: true, best: r.best }
  const chunks = r.chunks

  // claims
  const claims: Claim[] = []
  for (let i = 0; i < chunks.length; i++) {
    onStage(`Extracting claims ${i + 1} of ${chunks.length}`)
    const found = await extractClaims(engine, question, chunks[i].text)
    stop()
    for (const text of found) claims.push({ id: `c${claims.length}`, text, doc_id: chunks[i].id.split(':')[0], chunk_id: chunks[i].id, year: chunks[i].year })
  }
  if (claims.length < 2) throw new Error('The model did not produce enough claims from the retrieved passages.')

  // candidate pairs across different documents
  onStage('Finding claims worth comparing')
  const cv = await embed(claims.map((c) => c.text))
  const pairs: { i: number; j: number; s: number }[] = []
  for (let i = 0; i < claims.length; i++) for (let j = i + 1; j < claims.length; j++) {
    if (claims[i].doc_id === claims[j].doc_id) continue
    const s = dot(cv[i], cv[j] as Float32Array)
    if (s >= 0.4) pairs.push({ i, j, s })
  }
  pairs.sort((a, b) => b.s - a.s)
  const top = pairs.slice(0, 12)

  const edges: Edge[] = []
  for (let k = 0; k < top.length; k++) {
    onStage(`Comparing claims ${k + 1} of ${top.length}`)
    const { i, j } = top[k]
    const label = await labelPair(engine, claims[i].text, claims[j].text)
    stop()
    if (label === 'neutral') continue
    let cda7: string | null = null
    if (label === 'contradicts') { cda7 = await labelCause(engine, claims[i].text, claims[j].text); stop() }
    edges.push({ source: claims[i].id, target: claims[j].id, label, cda7 })
  }

  // positions
  onStage('Grouping claims into positions')
  const groups = cluster(claims, cv, edges)
    .filter((g) => g.length >= 2 || g.some((i) => edges.some((e) => e.label === 'contradicts' && (e.source === claims[i].id || e.target === claims[i].id))))
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)

  const views: View[] = []
  for (let g = 0; g < groups.length; g++) {
    onStage(`Writing position ${g + 1} of ${groups.length}`)
    const members = groups[g].map((i) => claims[i])
    const out = await generate(
      engine,
      'You summarise related claims from scientific abstracts. Use only the claims given.',
      `Related claims:\n${members.map((m) => `- ${m.text}`).join('\n')}\n\nQuestion: ${question}\n\nReply in exactly this format:\nPosition: <one sentence saying what these claims say about the question>\nLimits: <one sentence on what this evidence cannot show, or "none stated">`,
      120
    )
    stop()
    const pos = out.match(/Position:\s*(.+)/i)?.[1]?.trim() || members[0].text
    const lim = out.match(/Limits:\s*(.+)/i)?.[1]?.trim() || ''
    const docs = new Set(members.map((m) => m.doc_id))
    const ids = new Set(groups[g].map((i) => claims[i].id))
    const contradicted = edges.some((e) => e.label === 'contradicts' && (ids.has(e.source) !== ids.has(e.target)))
    const tier = contradicted ? (docs.size >= 2 ? 'medium' : 'low') : docs.size >= 3 ? 'high' : docs.size === 2 ? 'medium' : 'low'
    views.push({
      position: pos.replace(/^["“]|["”]$/g, ''),
      summary: members.map((m) => m.text).join(' '),
      weaknesses: /^none/i.test(lim) ? '' : lim,
      sources: [...new Set(members.map((m) => m.chunk_id))],
      disagreement_causes: [...new Set(edges.filter((e) => e.label === 'contradicts' && e.cda7 && (ids.has(e.source) || ids.has(e.target))).map((e) => e.cda7 as string))],
      confidence_tier: tier
    })
  }

  // single-answer baseline over the same passages
  onStage('Writing the single-answer baseline')
  const vanilla = await generate(
    engine,
    'Answer the question in three or four sentences using only the passages. Do not add outside facts.',
    `${chunks.map((c, i) => `[${i + 1}] ${c.text.slice(0, 700)}`).join('\n\n')}\n\nQuestion: ${question}`,
    170
  )
  stop()

  // evidence per year
  const byYear = new Map<number, [number, number]>()
  for (const c of claims) byYear.set(c.year, [(byYear.get(c.year)?.[0] ?? 0) + 1, byYear.get(c.year)?.[1] ?? 0])
  for (const e of edges) {
    if (e.label !== 'contradicts') continue
    const y = Math.max(claims.find((c) => c.id === e.source)!.year, claims.find((c) => c.id === e.target)!.year)
    const cur = byYear.get(y) ?? [0, 0]
    byYear.set(y, [cur[0], cur[1] + 1])
  }

  return {
    id: `device_${Date.now()}`, question, model, source: 'device', views, claims, edges, chunks,
    curve: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, v]) => [String(y), v] as [string, [number, number]]),
    vanilla, seconds: Math.round((performance.now() - t0) / 1000)
  }
}
