import { CommandBlock, Separator, Toast, useToast } from '@nous-research/ui'
import { Chapter, Note } from './parts'

const REPO = 'https://github.com/amethystani/evirag-bench'
const STEPS: [string, string, string][] = [
  ['01', 'Install', `cargo install --git ${REPO}`],
  ['02', 'Start the models', 'ollama serve'],
  ['03', 'Run the smoke test', './scripts/smoke.sh'],
  ['04', 'Score a run', 'evirag-bench evaluate runs/full.jsonl data/gold/benchmark.jsonl runs/full.metrics.json']
]

export function Quickstart() {
  const { toast, showToast } = useToast(2200)
  return (
    <Chapter
      id="run-it"
      no="XIII. Run it yourself"
      title="Four commands to a first answer"
      lead="Everything runs locally against Ollama, so no data leaves the machine. Copy a command, or read the docs for the full corpus and benchmark workflow."
    >
      <div
        className="flex flex-col gap-2"
        onClick={(e) => {
          const t = e.target as HTMLElement
          if (t.closest('button')) showToast('Copied to clipboard', 'success')
        }}
      >
        {STEPS.map(([n, label, code], i) => (
          <div key={n}>
            {i > 0 && <Separator className="my-4 opacity-30" />}
            <div className="grid items-start gap-3 md:grid-cols-[6rem_1fr]">
              <span className="hw-mono text-[calc(30*var(--u))] max-md:text-lg">{n}</span>
              <CommandBlock label={label} code={code} />
            </div>
          </div>
        ))}
      </div>
      <Toast toast={toast} />
      <Note>The default run uses qwen3.6:35b-a3b with all-minilm. The smoke test uses a much smaller model so it finishes quickly on a laptop.</Note>
    </Chapter>
  )
}
