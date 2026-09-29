import { AutoTokenizer, AutoModelForSequenceClassification } from '@huggingface/transformers'

const id = 'Xenova/nli-deberta-v3-xsmall'
const tok = await AutoTokenizer.from_pretrained(id)
const model = await AutoModelForSequenceClassification.from_pretrained(id, { dtype: 'q8' })
const labels = model.config.id2label
console.log('labels', labels)

const softmax = (x) => { const m = Math.max(...x); const e = x.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s) }
async function judge(a, b) {
  const inputs = tok(a, { text_pair: b, padding: true, truncation: true, max_length: 256 })
  const { logits } = await model(inputs)
  const p = softmax(Array.from(logits.data))
  return Object.fromEntries(p.map((v, i) => [labels[i], +v.toFixed(3)]))
}
const pairs = [
  ['Homework improves academic achievement.', 'Homework has little effect on academic performance.', 'contradiction'],
  ['Homework improves academic achievement.', 'Homework involvement is positively related to academic achievement.', 'entailment'],
  ['Homework has little effect on academic performance.', 'Homework involvement is positively related to academic achievement, especially for immigrant students.', 'contradiction'],
  ['In primary school, more homework does not consistently improve achievement.', 'In secondary school, homework practice is associated with higher achievement in mathematics.', 'neutral/contradiction'],
  ['Parental involvement changed over the school year.', 'Homework time was measured in minutes.', 'neutral'],
  ['Raising the minimum wage reduced employment among young workers.', 'We find no significant effect of the minimum wage increase on employment.', 'contradiction'],
  ['Statins reduce the risk of cardiovascular events in people without prior disease.', 'Statin therapy lowered LDL cholesterol and reduced first cardiovascular events.', 'entailment']
]
for (const [a, b, want] of pairs) console.log(want.padEnd(22), JSON.stringify(await judge(a, b)), '|', a.slice(0, 40))
