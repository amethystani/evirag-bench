use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use evirag_bench::{
    corpus::{chunk_documents_tokenized, load_tokenizer, read_jsonl, write_jsonl},
    eval,
    model::Ollama,
    pipeline,
    retrieval::Index,
    types::{Chunk, Document, GoldQuery, Output, Query},
};
use serde_json::json;
use std::{collections::BTreeMap, fs, path::PathBuf};

#[derive(Parser)]
#[command(
    name = "evirag",
    about = "Disagreement-aware scientific retrieval and evaluation"
)]
struct Cli {
    #[arg(long, default_value = "http://localhost:11434", global = true)]
    host: String,
    #[arg(long, default_value = "qwen3.6:35b-a3b", global = true)]
    model: String,
    #[arg(long, default_value = "all-minilm", global = true)]
    embed_model: String,
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Chunk {
        documents: PathBuf,
        output: PathBuf,
        #[arg(long, default_value_t = 256)]
        size: usize,
        #[arg(long, default_value_t = 32)]
        overlap: usize,
        #[arg(long, default_value = "data/tokenizer.json")]
        tokenizer: PathBuf,
    },
    Index {
        chunks: PathBuf,
        output: PathBuf,
    },
    Run {
        index: PathBuf,
        queries: PathBuf,
        output: PathBuf,
        #[arg(long, default_value = "full", value_parser = ["full", "no-graph", "no-multi-view", "closed-book", "vanilla", "vanilla-15", "structured", "single-agent", "mmr"])]
        system: String,
        #[arg(long)]
        limit: Option<usize>,
        #[arg(long, value_parser = ["auto", "contested", "resolved"], default_value = "auto")]
        intent: String,
    },
    Evaluate {
        outputs: PathBuf,
        gold: PathBuf,
        report: PathBuf,
    },
    Compare {
        left: PathBuf,
        right: PathBuf,
        output: PathBuf,
        #[arg(long, default_value_t = 40)]
        comparisons: usize,
    },
    ValidateGold {
        gold: PathBuf,
        #[arg(long)]
        full: bool,
    },
    FetchOpenalex {
        output: PathBuf,
        #[arg(long, default_value_t = 200)]
        per_domain: usize,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let model = Ollama::new(cli.host, cli.model, cli.embed_model)?;
    match cli.command {
        Command::Chunk {
            documents,
            output,
            size,
            overlap,
            tokenizer,
        } => {
            let documents: Vec<Document> = read_jsonl(&documents)?;
            let tokenizer = load_tokenizer(&tokenizer)?;
            write_jsonl(
                &output,
                &chunk_documents_tokenized(&documents, size, overlap, &tokenizer)?,
            )?;
        }
        Command::Index { chunks, output } => {
            let chunks: Vec<Chunk> = read_jsonl(&chunks)?;
            Index::build(chunks, &model)?.save(&output)?;
        }
        Command::Run {
            index,
            queries,
            output,
            system,
            limit,
            intent,
        } => {
            let index = Index::load(&index, &model)?;
            let queries: Vec<Query> = read_jsonl(&queries)?;
            let mut rows = Vec::new();
            for query in queries.iter().take(limit.unwrap_or(usize::MAX)) {
                let override_value = if intent == "auto" {
                    None
                } else {
                    Some(intent.as_str())
                };
                let result = pipeline::run(query, &index, &model, &system, override_value)?;
                println!(
                    "{}: {} retrieved passages",
                    query.id,
                    result.retrieved.len()
                );
                rows.push(result);
                write_jsonl(&output, &rows)?;
            }
        }
        Command::Evaluate {
            outputs,
            gold,
            report,
        } => {
            let outputs: Vec<Output> = read_jsonl(&outputs)?;
            let gold: Vec<GoldQuery> = read_jsonl(&gold)?;
            let by_id: BTreeMap<_, _> = gold.iter().map(|g| (g.id.as_str(), g)).collect();
            let scores = outputs
                .iter()
                .map(|o| {
                    let g = by_id
                        .get(o.id.as_str())
                        .with_context(|| format!("missing gold for {}", o.id))?;
                    eval::score(o, g, &model)
                })
                .collect::<Result<Vec<_>>>()?;
            let aggregate = BTreeMap::from([
                (
                    "vc_emb",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.vc_emb).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
                (
                    "svc",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.svc).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
                (
                    "cr",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.cr).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
                (
                    "cce",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.cce).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
                (
                    "ec_at_k",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.ec_at_k).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
                (
                    "fs",
                    eval::bootstrap(
                        &scores.iter().filter_map(|s| s.fs).collect::<Vec<_>>(),
                        2000,
                    ),
                ),
            ]);
            if let Some(parent) = report.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(
                report,
                serde_json::to_vec_pretty(&json!({"per_query": scores, "aggregate": aggregate}))?,
            )?;
        }
        Command::Compare {
            left,
            right,
            output,
            comparisons,
        } => {
            let left: serde_json::Value = serde_json::from_slice(&fs::read(left)?)?;
            let right: serde_json::Value = serde_json::from_slice(&fs::read(right)?)?;
            let a: Vec<eval::Scores> = serde_json::from_value(left["per_query"].clone())?;
            let b: Vec<eval::Scores> = serde_json::from_value(right["per_query"].clone())?;
            let report = eval::compare_scores(&a, &b, comparisons);
            if let Some(parent) = output.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(output, serde_json::to_vec_pretty(&report)?)?;
        }
        Command::ValidateGold { gold, full } => {
            let gold: Vec<GoldQuery> = read_jsonl(&gold)?;
            let errors = eval::validate_gold(&gold, full);
            for error in &errors {
                eprintln!("{error}");
            }
            anyhow::ensure!(
                errors.is_empty(),
                "gold validation failed with {} errors",
                errors.len()
            );
            println!("{} gold queries valid", gold.len());
        }
        Command::FetchOpenalex { output, per_domain } => {
            evirag_bench::corpus::fetch_openalex(&output, per_domain)?
        }
    }
    Ok(())
}
