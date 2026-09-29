import type { Chunk } from '../data'

type Doc = { id: string; domain: string; title: string; year: number; authors: string; doi: string | null; license: string; text: string }
type Corpus = { docs: Doc[]; vecs: Float32Array; dim: number }

export const DOMAIN_NAMES: Record<string, string> = {
  education: 'Education', biomedicine: 'Biomedicine', economics: 'Economics', earth_sciences: 'Earth sciences', nutrition: 'Nutrition'
}

const base = () => new URL('../corpus/', location.href)
let corpusP: Promise<Corpus> | null = null
export function loadCorpus() {
  corpusP ??= (async () => {
    const [c, v] = await Promise.all([fetch(new URL('corpus.json', base())).then((r) => r.json()), fetch(new URL('vectors.json', base())).then((r) => r.json())])
    const bin = atob(v.data as string)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { docs: c.docs as Doc[], vecs: new Float32Array(bytes.buffer), dim: v.dim as number }
  })()
  return corpusP
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorP: Promise<any> | null = null
/** Sentence embeddings with all-MiniLM-L6-v2, run in the browser (about 23 MB, cached by the browser after the first load). */
export async function embed(texts: string[]): Promise<Float32Array[]> {
  extractorP ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
  })()
  const ex = await extractorP
  const out: Float32Array[] = []
  for (const t of texts) {
    const r = await ex(t, { pooling: 'mean', normalize: true })
    out.push(new Float32Array(r.data as Float32Array))
  }
  return out
}

export const dot = (a: Float32Array, b: Float32Array, off = 0) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[off + i]; return s }

export type Retrieval = { chunks: Chunk[]; domain: string; best: number } | { chunks: null; best: number; domain: null }

const ROLE_SUFFIX = {
  skeptic: ' however no effect, contradicting or null findings, criticism and limitations',
  counter: ' alternative explanation, minority view, different population or setting'
}

/** Four retrieval roles over the domain that best matches the question. */
export async function retrieve(question: string, cap = 6): Promise<Retrieval> {
  const corpus = await loadCorpus()
  const [q, sk, cf] = await embed([question, question + ROLE_SUFFIX.skeptic, question + ROLE_SUFFIX.counter])
  const sims = (v: Float32Array) => corpus.docs.map((_, i) => dot(v, corpus.vecs, i * corpus.dim))
  const base = sims(q)

  // Which domain does the question belong to? Mean of the top three passages per domain.
  const byDomain = new Map<string, number[]>()
  corpus.docs.forEach((d, i) => byDomain.set(d.domain, [...(byDomain.get(d.domain) ?? []), base[i]]))
  let domain = '', best = -1
  for (const [d, arr] of byDomain) {
    const top = arr.sort((a, b) => b - a).slice(0, 3)
    const m = top.reduce((s, x) => s + x, 0) / top.length
    if (m > best) { best = m; domain = d }
  }
  if (best < 0.3) return { chunks: null, best, domain: null }

  const idx = corpus.docs.map((d, i) => (d.domain === domain ? i : -1)).filter((i) => i >= 0)
  const rank = (s: number[]) => [...idx].sort((a, b) => s[b] - s[a])
  const picks: number[] = []
  const add = (arr: number[], n: number) => { for (const i of arr) { if (picks.length >= cap) return; if (!picks.includes(i) && n-- > 0) picks.push(i) } }
  add(rank(base), 2)          // precision
  add(rank(sims(sk)), 2)      // skeptic
  add(rank(sims(cf)), 1)      // counterfactual
  add(rank(base), cap)        // recall fills the rest
  return {
    domain, best,
    chunks: picks.map((i) => {
      const d = corpus.docs[i]
      const docId = d.id.replace(':', '_')
      return { id: `${docId}:0:0`, title: d.title, year: d.year, section: 'abstract', text: d.text, authors: d.authors, doi: d.doi, license: d.license, domain: d.domain }
    })
  }
}
