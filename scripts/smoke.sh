#!/usr/bin/env bash
set -euo pipefail
EVI=${EVI:-target/debug/evirag-bench}
SMOKE_MODEL=${SMOKE_MODEL:-qwen2.5:0.5b}
cargo build
ollama pull all-minilm
ollama pull "$SMOKE_MODEL"
"$EVI" chunk data/smoke/documents.jsonl data/smoke/chunks.jsonl
"$EVI" --embed-model all-minilm index data/smoke/chunks.jsonl data/smoke/index.json
"$EVI" --model "$SMOKE_MODEL" --embed-model all-minilm run data/smoke/index.json data/smoke/queries.jsonl runs/smoke.jsonl --system full --intent contested --limit 1
"$EVI" validate-gold data/smoke/gold.jsonl
"$EVI" --model "$SMOKE_MODEL" --embed-model all-minilm evaluate runs/smoke.jsonl data/smoke/gold.jsonl runs/smoke.metrics.json
