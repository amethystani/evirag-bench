import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import type { Claim, Edge, RunData, View } from '../data'
import { dot, embed, retrieve } from './retrieve'
import { generate } from './llm'
import { judge } from './nli'

export type Progress = (stage: string) => void
export { Cancelled } from './config'
import { Cancelled } from './config'

const CAUSES = ['replication', 'population', 'operational', 'methodological', 'statistical', 'temporal', 'theoretical']
const clean = (s: string) => s.replace(/^[\s\-*\d.)]+/, '').replace(/\s+/g, ' ').trim()

const CUE = /\b(found|find|show|shows|showed|result|results|associated|effect|effects|significant|significantly|conclude|concluded|suggest|suggests|indicate|indicates|increase|decrease|improve|improves|reduce|reduces|no evidence|positive|negative)\b/i
const BACKGROUND = /\b(has been|have been|is an important|extensively|in recent years|previous (research|studies)|the (aim|purpose|goal) of|this (study|paper|article) (aims|examines|investigates|explores|analy[sz]es)|we (examine|investigate|explore|analy[sz]e))\b/i
const METHOD = /\b(participants were|we used|sample of|questionnaire|were recruited|data (were|was) collected)\b/i
const CONTENT_STOP = new Set('this that with from were have been which their there these those also more than into about between within study studies paper article research authors using used based'.split(' '))
const contentWords = (t: string) => (t.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !CONTENT_STOP.has(w))
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '')

/** Claims are quoted sentences from the abstract, chosen by relevance to the question, so they cannot be invented. */
async function extractClaims(question: string, qv: Float32Array, text: string) {
  const sentences = (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map((x) => x.trim()).filter((x) => x.length >= 40 && x.length <= 300)
  if (!sentences.length) return []
  const vecs = await embed(sentences)
  return sentences
    .map((sent, i) => ({ sent, score: dot(qv, vecs[i] as Float32Array) + (CUE.test(sent) ? 0.1 : 0) - (BACKGROUND.test(sent) ? 0.15 : 0) - (METHOD.test(sent) ? 0.06 : 0) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 2)
    .map((x) => x.sent)
}

/** True if most of a sentence's content words come from the given source claims (guards against invented wording). */
function grounded(sentence: string, sources: string[]) {
  const have = new Set(sources.flatMap(contentWords).map(stem))
  const words = contentWords(sentence).map(stem)
  if (words.length < 3) return false
  return words.filter((w) => have.has(w)).length / words.length >= 0.6
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
    let bi = -1, bj = -1, bs = 0.6
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

  // claims: quoted sentences, chosen by relevance to the question
  const claims: Claim[] = []
  const [qv] = await embed([question])
  for (let i = 0; i < chunks.length; i++) {
    onStage(`Reading passage ${i + 1} of ${chunks.length}`)
    const found = await extractClaims(question, qv, chunks[i].text)
    stop()
    for (const text of found) claims.push({ id: `c${claims.length}`, text, doc_id: chunks[i].id.split(':')[0], chunk_id: chunks[i].id, year: chunks[i].year })
  }
  if (claims.length < 2) throw new Error('Not enough usable sentences were found in the retrieved passages.')

  // candidate pairs across different documents
  onStage('Finding claims worth comparing')
  const cv = await embed(claims.map((c) => c.text))
  const pairs: { i: number; j: number; s: number }[] = []
  for (let i = 0; i < claims.length; i++) for (let j = i + 1; j < claims.length; j++) {
    if (claims[i].doc_id === claims[j].doc_id) continue
    const s = dot(cv[i], cv[j] as Float32Array)
    if (s >= 0.32) pairs.push({ i, j, s })
  }
  pairs.sort((a, b) => b.s - a.s)
  const top = pairs.slice(0, 24)

  const edges: Edge[] = []
  for (let k = 0; k < top.length; k++) {
    onStage(`Comparing claims ${k + 1} of ${top.length}`)
    const { i, j } = top[k]
    const label = await judge(claims[i].text, claims[j].text)
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
    const modelPos = (out.match(/Position:\s*(.+)/i)?.[1] ?? '').trim()
    const central = members.map((m, mi) => ({ m, score: groups[g].reduce((sum, idx) => sum + dot(cv[groups[g][mi]], cv[idx] as Float32Array), 0) })).sort((x, y) => y.score - x.score)[0].m
    const pos = modelPos && grounded(modelPos, members.map((m) => m.text)) ? modelPos : central.text
    const limRaw = (out.match(/Limits:\s*(.+)/i)?.[1] ?? '').trim()
    const lim = limRaw && grounded(limRaw, members.map((m) => m.text)) ? limRaw : ''
    const docs = new Set(members.map((m) => m.doc_id))
    const ids = new Set(groups[g].map((i) => claims[i].id))
    const contradicted = edges.some((e) => e.label === 'contradicts' && (ids.has(e.source) !== ids.has(e.target)))
    const tier = contradicted ? (docs.size >= 2 ? 'medium' : 'low') : docs.size >= 3 ? 'high' : docs.size === 2 ? 'medium' : 'low'
    views.push({
      position: pos.replace(/^["“]|["”]$/g, ''),
      summary: members.map((m) => m.text).join(' ').slice(0, 520),
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
