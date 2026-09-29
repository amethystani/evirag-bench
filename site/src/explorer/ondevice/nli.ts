// A small natural-language-inference model judges whether two claims agree or contradict.
// It is far more reliable at this than the chat model, and it is only about 83 MB.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stateP: Promise<{ tok: any; model: any; labels: Record<string, string> }> | null = null
const ID = 'Xenova/nli-deberta-v3-xsmall'

function load() {
  stateP ??= (async () => {
    const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    const [tok, model] = await Promise.all([AutoTokenizer.from_pretrained(ID), AutoModelForSequenceClassification.from_pretrained(ID, { dtype: 'q8' })])
    return { tok, model, labels: (model.config as unknown as { id2label: Record<string, string> }).id2label }
  })()
  return stateP
}
export const warmNli = () => load().then(() => undefined)

const softmax = (x: number[]) => { const m = Math.max(...x); const e = x.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s) }

export type Stance = { contradiction: number; entailment: number; neutral: number }

async function judgeOne(a: string, b: string): Promise<Stance> {
  const { tok, model, labels } = await load()
  const inputs = tok(a, { text_pair: b, padding: true, truncation: true, max_length: 256 })
  const { logits } = await model(inputs)
  const p = softmax(Array.from(logits.data as Float32Array))
  const out: Stance = { contradiction: 0, entailment: 0, neutral: 0 }
  p.forEach((v, i) => { out[labels[i] as keyof Stance] = v })
  return out
}

/** Average of both directions, so the result does not depend on which claim comes first. */
export async function judge(a: string, b: string): Promise<'contradicts' | 'supports' | 'neutral'> {
  const [x, y] = await Promise.all([judgeOne(a, b), judgeOne(b, a)])
  const c = (x.contradiction + y.contradiction) / 2
  const e = (x.entailment + y.entailment) / 2
  if (c >= 0.6) return 'contradicts'
  if (e >= 0.6) return 'supports'
  return 'neutral'
}
