# Contributing

Thanks for looking at EVIRAG Bench. Bug reports, new baselines, corpora, annotations, and documentation fixes are all welcome.

## Setup

Install Rust (stable) and [Ollama](https://ollama.com/download), then:

```sh
cargo build
cargo test
./scripts/smoke.sh
```

## Before opening a pull request

```sh
cargo fmt
cargo clippy --all-targets -- -D warnings
cargo test
```

CI runs the same three checks on Linux and macOS.

## What fits well

- **Baselines.** Add a system under `src/pipeline.rs` behind a `--system` value and document it in `docs/run-settings.md`.
- **Corpora and annotations.** Follow `docs/annotation.md` and `data/schema.example.json`, and validate with `evirag-bench validate-gold`.
- **Metrics.** Put definitions in `docs/run-settings.md` and cover them with a unit test.
- **Documentation.** Fix anything unclear, especially setup steps.

## Pull requests

Keep changes focused, explain what and why in the description, and link the issue. Match the surrounding code style. Do not include model weights, large corpora, or run outputs; these are ignored by `.gitignore`.

## Reporting problems

Use the issue forms. For security concerns see [SECURITY.md](SECURITY.md).
