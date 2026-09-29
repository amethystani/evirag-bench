#!/usr/bin/env bash
set -euo pipefail

EMBED_MODEL=${EMBED_MODEL:-all-minilm}
MODEL=${MODEL:-qwen3.6:35b-a3b}

ollama pull "$EMBED_MODEL"
ollama pull "$MODEL"
ollama list
