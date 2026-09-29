#!/usr/bin/env bash
set -euo pipefail

CORPUS=${CORPUS:-data/corpus/documents.jsonl}
GOLD=${GOLD:-data/gold/benchmark.jsonl}
MODEL=${MODEL:-qwen3.6:35b-a3b}
EMBED_MODEL=${EMBED_MODEL:-all-minilm}

if [[ ! -f "$CORPUS" || ! -f "$GOLD" ]]; then
  echo "Set CORPUS and GOLD to document and benchmark JSONL files." >&2
  exit 2
fi

EVI=${EVI:-target/release/evirag-bench}
cargo build --release
"$EVI" validate-gold "$GOLD" --full
ollama pull "$EMBED_MODEL"
ollama pull "$MODEL"
mkdir -p runs
ollama list > runs/models.txt
openssl dgst -sha256 "$CORPUS" "$GOLD" > runs/input_sha256.txt
git rev-parse HEAD > runs/code_revision.txt
"$EVI" chunk "$CORPUS" data/corpus/chunks.jsonl
"$EVI" --embed-model "$EMBED_MODEL" index data/corpus/chunks.jsonl data/index.json
for system in full no-graph no-multi-view closed-book vanilla vanilla-15 structured single-agent mmr; do
  "$EVI" --model "$MODEL" --embed-model "$EMBED_MODEL" run data/index.json "$GOLD" "runs/$system.jsonl" --system "$system"
  "$EVI" --embed-model "$EMBED_MODEL" evaluate "runs/$system.jsonl" "$GOLD" "runs/$system.metrics.json"
done
for system in no-graph no-multi-view closed-book vanilla vanilla-15 structured single-agent mmr; do
  "$EVI" compare runs/full.metrics.json "runs/$system.metrics.json" "runs/full_vs_$system.json" --comparisons 40
done
