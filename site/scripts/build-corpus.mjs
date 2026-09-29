// Builds the small on-device corpus: openly licensed abstracts from OpenAlex for the five benchmark domains.
// Only works whose primary location carries a CC-BY family licence are kept, so each abstract can be reused with attribution.
import { writeFileSync } from 'node:fs'

const DOMAINS = [
  { id: 'education', name: 'Education', query: 'homework academic achievement', must: /homework/i },
  { id: 'biomedicine', name: 'Biomedicine', query: 'statins primary prevention cardiovascular events', must: /statin/i },
  { id: 'economics', name: 'Economics', query: 'minimum wage employment effects', must: /minimum wage/i },
  { id: 'earth_sciences', name: 'Earth sciences', query: 'cloud feedback climate sensitivity', must: /cloud|climate sensitivity|feedback/i },
  { id: 'nutrition', name: 'Nutrition', query: 'dietary saturated fat cardiovascular disease risk', must: /saturated fat|dietary fat|fatty acid/i }
]
const PER_DOMAIN = Number(process.env.PER_DOMAIN ?? 9)
const KEY = process.env.OPENALEX_API_KEY

const abstractOf = (inv) => {
  const words = []
  for (const [w, pos] of Object.entries(inv ?? {})) for (const p of pos) words[p] = w
  return words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

const out = []
for (const d of DOMAINS) {
  const url = new URL('https://api.openalex.org/works')
  url.searchParams.set('search', d.query)
  url.searchParams.set('filter', 'has_abstract:true,primary_location.license:cc-by|cc0|cc-by-sa,type:article,language:en')
  url.searchParams.set('per-page', '60')
  url.searchParams.set('select', 'id,doi,title,publication_year,authorships,primary_location,abstract_inverted_index')
  if (KEY) url.searchParams.set('api_key', KEY)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${d.id}: HTTP ${res.status}`)
  const json = await res.json()
  let n = 0
  const years = new Set()
  for (const w of json.results) {
    const text = abstractOf(w.abstract_inverted_index)
    const words = text.split(' ').length
    if (words < 60 || words > 320) continue            // skip stubs and very long abstracts
    if (!d.must.test(`${w.title} ${text}`)) continue  // keep only papers that are actually about the topic
    if (n >= PER_DOMAIN) break
    const authors = (w.authorships ?? []).map((a) => a.author?.display_name).filter(Boolean)
    out.push({
      id: `${d.id}:${n}`,
      domain: d.id,
      title: w.title,
      year: w.publication_year,
      authors: authors.length > 3 ? `${authors.slice(0, 3).join(', ')} et al.` : authors.join(', '),
      doi: w.doi,
      openalex: w.id,
      license: w.primary_location?.license,
      venue: w.primary_location?.source?.display_name ?? null,
      text
    })
    years.add(w.publication_year)
    n++
  }
  console.log(`${d.id}: ${n} abstracts, years ${[...years].sort().join(', ')}`)
  await new Promise((r) => setTimeout(r, 400))
}
writeFileSync('public/corpus/corpus.json', JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: 'OpenAlex', docs: out }, null, 1))
console.log('total', out.length)
