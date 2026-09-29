// Embeds the on-device corpus with all-MiniLM-L6-v2 (the same encoder the browser uses for the query).
import { pipeline } from '@huggingface/transformers'
import { readFileSync, writeFileSync } from 'node:fs'

const corpus = JSON.parse(readFileSync('public/corpus/corpus.json', 'utf8'))
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
const vectors = []
for (const d of corpus.docs) {
  const t = await extractor(`${d.title}. ${d.text}`, { pooling: 'mean', normalize: true })
  vectors.push(Array.from(t.data))
}
const dim = vectors[0].length
const flat = new Float32Array(vectors.length * dim)
vectors.forEach((v, i) => flat.set(v, i * dim))
writeFileSync('public/corpus/vectors.json', JSON.stringify({
  model: 'Xenova/all-MiniLM-L6-v2', dtype: 'q8', dim, count: vectors.length,
  data: Buffer.from(flat.buffer).toString('base64')
}))
console.log('embedded', vectors.length, 'docs, dim', dim)
