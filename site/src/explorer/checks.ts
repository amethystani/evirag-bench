import type { Edge, RunData } from './data'

const STOP = new Set(('the a an and or but if then of to in on for with by as at from into over than that this these those is are was were be been being has have had do does did not no can could may might will would should must ' +
  'it its their there here which who whom whose what when where why how also only more most much many some any each such very just about between within across through while both either neither ' +
  'evidence suggests suggest indicates indicate shows show results result based passage passages study studies however therefore thus ' +
  'cannot exact various factors factor influenced influence associated relationship cause rule confounder observational design unclear retrieved determine necessarily consistently').split(' '))

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '')
const words = (t: string) => (t.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w))

/**
 * Content words in a view that appear in neither its cited passages nor the question.
 * A cheap faithfulness signal, not proof: it only fires when two or more such words show up,
 * and it ignores the model's stock "unclear from the passages" filler.
 */
export function unsupportedWords(run: RunData, v: { summary: string; weaknesses: string; sources: string[] }) {
  const have = new Set(run.chunks.filter((c) => v.sources.includes(c.id)).flatMap((c) => words(c.text + ' ' + c.title)).map(stem))
  for (const w of words(run.question)) have.add(stem(w))
  const text = v.summary + ' ' + (/^\s*unclear/i.test(v.weaknesses) ? '' : v.weaknesses)
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of words(text)) {
    const s = stem(w)
    if (!have.has(s) && !seen.has(s)) { seen.add(s); out.push(w) }
  }
  return out.length >= 2 ? out : []
}

const CAVEAT = /\b(cannot|can't|may|might|confound|unclear|unknown|not clear|limited|should be interpreted)\b/i
export const claimOf = (run: RunData, id: string) => run.claims.find((c) => c.id === id)!
export const looksLikeCaveat = (run: RunData, e: Edge) => CAVEAT.test(claimOf(run, e.source).text) || CAVEAT.test(claimOf(run, e.target).text)
export const contradictionsOf = (run: RunData) => run.edges.filter((e) => e.label === 'contradicts')
export const supportsOf = (run: RunData) => run.edges.filter((e) => e.label === 'supports')

export type Tension = { a: string; b: string; aYear: number; bYear: number; pairs: Edge[]; direct: number }

/** Group claim-level contradiction links into source-level conflicts. */
export function tensions(run: RunData): Tension[] {
  const map = new Map<string, Tension>()
  for (const e of contradictionsOf(run)) {
    const s = claimOf(run, e.source), t = claimOf(run, e.target)
    const [x, y] = [s, t].sort((p, q) => p.doc_id.localeCompare(q.doc_id))
    const key = `${x.doc_id}|${y.doc_id}`
    const cur = map.get(key) ?? { a: x.doc_id, b: y.doc_id, aYear: x.year, bYear: y.year, pairs: [], direct: 0 }
    cur.pairs.push(e)
    if (!looksLikeCaveat(run, e)) cur.direct++
    map.set(key, cur)
  }
  return [...map.values()]
}

export const CAUSE_PLAIN: Record<string, string> = {
  replication: 'a later attempt repeated the earlier design and did not find the same result',
  population: 'the studies looked at different groups of people or settings, such as different age groups',
  operational: 'the studies define or measure the same concept differently',
  methodological: 'the studies used different designs, interventions or controls',
  statistical: 'the studies read the uncertainty or effect size differently',
  temporal: 'the studies come from different periods and newer evidence differs from older',
  theoretical: 'the studies rest on competing explanations of the same observations'
}

export function dominantCause(run: RunData) {
  const count = new Map<string, number>()
  for (const e of contradictionsOf(run)) if (e.cda7) count.set(e.cda7, (count.get(e.cda7) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export type Check = { ok: boolean; label: string }

export function runChecks(run: RunData): Check[] {
  const ids = new Set(run.chunks.map((c) => c.id))
  const allResolve = run.views.every((v) => v.sources.every((s) => ids.has(s)))
  const uniqueDocs = new Set(run.views.flatMap((v) => v.sources.map((s) => s.split(':')[0])))
  const single = run.views.filter((v) => v.sources.length === 1)
  const dupPassages = [...new Set(single.map((v) => v.sources[0]))].filter((p) => single.filter((v) => v.sources[0] === p).length > 1)
  const flagged = run.views.map((v, i) => ({ i, words: unsupportedWords(run, v) })).filter((x) => x.words.length > 0)
  const t = tensions(run)
  const all = contradictionsOf(run)
  const checks: Check[] = [
    { ok: allResolve, label: 'Every citation points to a passage that was actually retrieved' },
    { ok: uniqueDocs.size > 1, label: `Answer draws on ${uniqueDocs.size} source${uniqueDocs.size === 1 ? '' : 's'}` },
    { ok: dupPassages.length === 0, label: dupPassages.length ? `${single.filter((v) => dupPassages.includes(v.sources[0])).length} views rest on the same single passage (${dupPassages.join(', ')})` : 'No two views rest on the same single passage' },
    { ok: flagged.length === 0, label: flagged.length ? `View ${flagged.map((f) => f.i + 1).join(', ')}: wording not found in its cited passages (${flagged.flatMap((f) => f.words).slice(0, 5).join(', ')})` : 'Each view’s wording is found in its cited passages' }
  ]
  if (all.length) checks.push({ ok: t.length > 0 && t.every((x) => x.direct > 0), label: `${t.length} source-level conflict${t.length === 1 ? '' : 's'}, ${t.reduce((n, x) => n + x.direct, 0)} of ${all.length} claim pairs look like direct contradictions` })
  else checks.push({ ok: true, label: 'No contradicting claims were found among the retrieved passages' })
  return checks
}

export function trustLine(run: RunData) {
  const docs = new Set(run.chunks.map((c) => c.id.split(':')[0])).size
  const low = run.views.filter((v) => v.confidence_tier === 'low').length
  return `Based on ${run.chunks.length} passage${run.chunks.length === 1 ? '' : 's'} from ${docs} source${docs === 1 ? '' : 's'}. ${low} of ${run.views.length} view${run.views.length === 1 ? ' is' : 's are'} low confidence.`
}
