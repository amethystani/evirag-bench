import run from '../smoke_full.json'

export type View = { position: string; summary: string; weaknesses: string; sources: string[]; disagreement_causes: string[]; confidence_tier: string }
export type Claim = { id: string; text: string; doc_id: string; chunk_id: string; year: number }
export type Edge = { source: string; target: string; label: string; cda7: string | null }
export type Chunk = { id: string; title: string; year: number; section: string; text: string }

export const REPO = 'https://github.com/amethystani/evirag-bench'
export const meta = { id: run.id, question: run.question, model: run.model, cls: run.controversy_class }
export const views = run.views as View[]
export const claims = run.claims as Claim[]
export const edges = run.edges as Edge[]
export const chunks = run.retrieved_chunks as Chunk[]
export const curve = Object.entries(run.temporal_curve as unknown as Record<string, [number, number]>)
export const contradictions = edges.filter((e) => e.label === 'contradicts')
export const supports = edges.filter((e) => e.label === 'supports')

// Results reported in the paper (main table and controls).
export const SYSTEMS: { name: string; vc: number; cr: number; calls: number }[] = [
  { name: 'Closed-book', vc: 0.392, cr: 0.214, calls: 1 },
  { name: 'Vanilla RAG (10)', vc: 0.423, cr: 0.572, calls: 1 },
  { name: 'Vanilla RAG (15)', vc: 0.521, cr: 0.612, calls: 1 },
  { name: 'Structured prompt (15)', vc: 0.736, cr: 0.613, calls: 1 },
  { name: 'EVIRAG without graph', vc: 0.512, cr: 0.604, calls: 5 },
  { name: 'EVIRAG full', vc: 0.847, cr: 0.742, calls: 14 }
]

export const STAGES = [
  ['Intent', 'Resolved or contested.', 'contested'],
  ['Retrieve', 'Four agents, one pool.', `${chunks.length} passages`],
  ['Claims', 'Atomic claims and signed links.', `${claims.length} claims, ${edges.length} links`],
  ['Causes', 'CDA-7 label per contradiction.', `${contradictions.length} labelled`],
  ['Time', 'Evidence per year.', `${curve.length} years`],
  ['Views', 'Signed Louvain partition.', `${views.length} views`],
  ['Confidence', 'Tier per view.', views.map((v) => v.confidence_tier).join(', ')]
] as const
