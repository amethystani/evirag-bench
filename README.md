<p align="center">
  <img src="docs/assets/prism.svg" alt="EVIRAG: one question enters a prism and fans out into distinct, source-linked views" width="100%">
</p>

# EVIRAG Bench

EVIRAG preserves disagreement across scientific retrieval and answer generation. The Rust executable provides the seven-stage pipeline, evaluation metrics, corpus tools, and baseline controls. The paper source and PDF are in `paper/`.

## Build

Install Rust and [Ollama](https://ollama.com/download). Start Ollama in one terminal:

```sh
ollama serve
```

In another terminal, run:

```sh
cargo build --release
./scripts/smoke.sh
```

The default run uses `qwen3.6:35b-a3b` and `all-minilm`. Use `scripts/fetch_models.sh` to pull both. `cargo test` checks corpus processing, signed Louvain, and scoring without downloading a model.

## Corpus and benchmark

Documents are JSON Lines with `id`, `title`, `text`, optional `year`, `venue`, `domain`, `doi`, and `sections`. Each section has a `heading` and `text`. The chunker uses the pinned MiniLM tokenizer to make 256-token passages with overlap 32 within section boundaries. Document and chunk IDs keep claims linked to passages. The tokenizer is downloaded once into `data/tokenizer.json`.

To collect a new abstract corpus from OpenAlex:

```sh
target/release/evirag-bench fetch-openalex data/corpus/openalex_abstracts.jsonl --per-domain 200
```

The OpenAlex command collects abstracts and metadata. For full-paper experiments, provide full paper text in the same document format. If OpenAlex returns 429, set `OPENALEX_API_KEY` to an account key. See [OpenAlex authentication](https://help.openalex.org/api/authentication/).

Gold queries follow `data/schema.example.json`. The `sources` field identifies corpus passages. The annotation protocol is in `docs/annotation.md`. Validate a pilot with:

```sh
target/release/evirag-bench validate-gold data/gold/pilot.jsonl
```

Use `--full` for the 1,250-query, five-domain benchmark layout.

## Run

```sh
target/release/evirag-bench chunk data/corpus/documents.jsonl data/corpus/chunks.jsonl
target/release/evirag-bench index data/corpus/chunks.jsonl data/index.json
target/release/evirag-bench run data/index.json data/gold/benchmark.jsonl runs/full.jsonl --system full
target/release/evirag-bench evaluate runs/full.jsonl data/gold/benchmark.jsonl runs/full.metrics.json
```

`scripts/run_all.sh` fetches the configured models and runs full EVIRAG, its two ablations, closed-book, vanilla at 10 and 15 passages, structured-prompt, single-agent, and MMR controls. Set `CORPUS`, `GOLD`, `MODEL`, `EMBED_MODEL`, or `EVI` to override defaults.

The full path first classifies the query as resolved or contested. Contested queries use four retrieval roles with budgets 3, 5, 4, and 3. The pipeline extracts atomic claims, labels claim pairs, assigns CDA-7 causes, partitions the signed graph with signed Louvain, tracks dated evidence, and synthesizes source-linked views. Resolved queries use a concise source-grounded answer. Each contested view contains a position, evidence summary, weaknesses, disagreement causes, passage IDs, and a confidence tier. The JSONL output also includes a readable answer template. Use `--intent contested` to inspect all seven stages on a specific query.

The response layout is in `docs/output.md`; the disagreement labels are in `docs/cda7.md`.

Evaluation computes embedding viewpoint coverage at 0.65, single-view concentration, contradiction recall, confidence calibration error, retrieval coverage at K, faithfulness against cited passages, bootstrap intervals, and paired Wilcoxon tests with Bonferroni adjustment. See `docs/run-settings.md` for definitions and run settings.

## Paper

`paper/acl_latex.tex` is the camera-ready source, with its bibliography, figure, ACL style files, and PDF. Run `cd paper && ./build.sh` if `tectonic` is installed.
