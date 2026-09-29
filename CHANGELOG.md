# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/).

## [0.1.0] - 2026-09-29

### Added
- Rust pipeline: intent classification, role-based retrieval, atomic claim extraction, claim-pair labelling with CDA-7 causes, signed Louvain partitioning, temporal evidence tracking, and source-linked view synthesis.
- Evaluation: viewpoint coverage, single-view concentration, contradiction recall, calibration error, retrieval coverage, faithfulness, bootstrap intervals, and paired Wilcoxon tests with Bonferroni adjustment.
- Baseline controls: closed-book, vanilla RAG, structured prompt, single agent, MMR, and two ablations.
- Corpus tools: chunker, OpenAlex fetcher, and gold-annotation validator.
- Smoke fixture and `scripts/preliminary_check.sh` for a quick end-to-end check.
- Paper source and PDF.
