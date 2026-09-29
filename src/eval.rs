use crate::{
    graph,
    model::{Ollama, dot},
    types::{Claim, GoldQuery, Output},
};
use anyhow::Result;
use rand::{Rng, SeedableRng, rngs::StdRng};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Serialize, Deserialize)]
pub struct Scores {
    pub id: String,
    pub vc_emb: Option<f32>,
    pub svc: Option<f32>,
    pub cr: Option<f32>,
    pub cce: Option<f32>,
    pub ec_at_k: Option<f32>,
    pub fs: Option<f32>,
}

#[derive(Serialize)]
pub struct PairedResult {
    pub n: usize,
    pub mean_delta: f64,
    pub p_adjusted: f64,
}

pub fn paired_wilcoxon(left: &[f64], right: &[f64], comparisons: usize) -> Option<PairedResult> {
    let mut differences = left
        .iter()
        .zip(right)
        .map(|(a, b)| a - b)
        .filter(|delta| delta.is_finite() && delta.abs() > 1e-12)
        .collect::<Vec<_>>();
    if differences.is_empty() {
        return None;
    }
    let n = differences.len();
    let mean_delta = differences.iter().sum::<f64>() / n as f64;
    differences.sort_by(|a, b| a.abs().total_cmp(&b.abs()));
    let mut ranks = vec![0.0; n];
    let mut ties = Vec::new();
    let mut start = 0;
    while start < n {
        let mut end = start + 1;
        while end < n && (differences[start].abs() - differences[end].abs()).abs() < 1e-12 {
            end += 1;
        }
        let rank = (start + 1 + end) as f64 / 2.0;
        for item in &mut ranks[start..end] {
            *item = rank;
        }
        ties.push(end - start);
        start = end;
    }
    let observed = differences
        .iter()
        .zip(&ranks)
        .filter(|(delta, _)| **delta > 0.0)
        .map(|(_, rank)| rank)
        .sum::<f64>();
    let total_rank = n as f64 * (n as f64 + 1.0) / 2.0;
    let p = if n <= 20 {
        let extreme = (0..(1_u64 << n))
            .filter(|mask| {
                let positive = ranks
                    .iter()
                    .enumerate()
                    .filter(|(i, _)| mask & (1_u64 << i) != 0)
                    .map(|(_, rank)| rank)
                    .sum::<f64>();
                (positive - total_rank / 2.0).abs() + 1e-12 >= (observed - total_rank / 2.0).abs()
            })
            .count();
        extreme as f64 / (1_u64 << n) as f64
    } else {
        let variance = n as f64 * (n as f64 + 1.0) * (2.0 * n as f64 + 1.0) / 24.0
            - ties.iter().map(|&t| (t * t * t - t) as f64).sum::<f64>() / 48.0;
        if variance <= 0.0 {
            1.0
        } else {
            let z = ((observed - total_rank / 2.0).abs() - 0.5).max(0.0) / variance.sqrt();
            2.0 * normal_tail(z)
        }
    };
    Some(PairedResult {
        n,
        mean_delta,
        p_adjusted: (p * comparisons.max(1) as f64).min(1.0),
    })
}

fn normal_tail(z: f64) -> f64 {
    let t = 1.0 / (1.0 + 0.2316419 * z);
    let polynomial = t
        * (0.319381530
            + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    polynomial * (-z * z / 2.0).exp() / (2.0 * std::f64::consts::PI).sqrt()
}

pub fn compare_scores(
    left: &[Scores],
    right: &[Scores],
    comparisons: usize,
) -> BTreeMap<&'static str, Option<PairedResult>> {
    let by_id = right
        .iter()
        .map(|row| (row.id.as_str(), row))
        .collect::<BTreeMap<_, _>>();
    let pairs = left
        .iter()
        .filter_map(|row| Some((row, *by_id.get(row.id.as_str())?)))
        .collect::<Vec<_>>();
    type Metric = (&'static str, fn(&Scores) -> Option<f32>);
    let metrics: [Metric; 5] = [
        ("vc_emb", |s| s.vc_emb),
        ("svc", |s| s.svc),
        ("cr", |s| s.cr),
        ("cce", |s| s.cce),
        ("fs", |s| s.fs),
    ];
    metrics
        .into_iter()
        .map(|(name, get)| {
            let values = pairs
                .iter()
                .filter_map(|(a, b)| Some((get(a)? as f64, get(b)? as f64)))
                .collect::<Vec<_>>();
            let left = values.iter().map(|(a, _)| *a).collect::<Vec<_>>();
            let right = values.iter().map(|(_, b)| *b).collect::<Vec<_>>();
            (name, paired_wilcoxon(&left, &right, comparisons))
        })
        .collect()
}

pub fn validate_gold(gold: &[GoldQuery], full: bool) -> Vec<String> {
    let mut errors = Vec::new();
    let mut ids = BTreeSet::new();
    let mut domains = BTreeMap::new();
    let mut classes = BTreeMap::new();
    for q in gold {
        if !ids.insert(&q.id) {
            errors.push(format!("{}: duplicate id", q.id));
        }
        *domains.entry(q.domain.as_str()).or_insert(0) += 1;
        *classes.entry(q.controversy_class.as_str()).or_insert(0) += 1;
        if ![
            "education",
            "biomedicine",
            "economics",
            "nutrition",
            "earth_sciences",
        ]
        .contains(&q.domain.as_str())
        {
            errors.push(format!("{}: unknown domain", q.id));
        }
        if q.question.trim().is_empty() {
            errors.push(format!("{}: empty question", q.id));
        }
        if !(2..=4).contains(&q.viewpoints.len()) {
            errors.push(format!("{}: expected 2 to 4 viewpoints", q.id));
        }
        for view in &q.viewpoints {
            if view.id.is_empty() || view.summary.is_empty() || view.sources.is_empty() {
                errors.push(format!("{}: viewpoint lacks text or provenance", q.id));
            }
        }
        if !(1..=8).contains(&q.contradictions.len()) {
            errors.push(format!("{}: expected 1 to 8 contradictions", q.id));
        }
        for pair in &q.contradictions {
            if pair.left.is_empty()
                || pair.right.is_empty()
                || !crate::graph::CDA7.contains(&pair.cda7.as_str())
            {
                errors.push(format!("{}: invalid contradiction pair", q.id));
            }
        }
        if !["resolved", "emerging", "stable", "polarized"].contains(&q.controversy_class.as_str())
        {
            errors.push(format!("{}: invalid controversy class", q.id));
        }
    }
    if full {
        if gold.len() != 1250 {
            errors.push(format!("expected 1250 queries, found {}", gold.len()));
        }
        for domain in [
            "education",
            "biomedicine",
            "economics",
            "nutrition",
            "earth_sciences",
        ] {
            if domains.get(domain).copied().unwrap_or(0) != 250 {
                errors.push(format!("{domain}: expected 250 queries"));
            }
        }
        for (class, expected) in [
            ("resolved", 190),
            ("emerging", 335),
            ("stable", 445),
            ("polarized", 280),
        ] {
            if classes.get(class).copied().unwrap_or(0) != expected {
                errors.push(format!("{class}: expected {expected} queries"));
            }
        }
    }
    errors
}

pub fn score(output: &Output, gold: &GoldQuery, model: &Ollama) -> Result<Scores> {
    let mut response = Vec::new();
    if !output.views.is_empty() {
        for view in &output.views {
            response.extend(graph::extract_response_claims(&view.summary, model)?);
        }
    } else if let Some(answer) = &output.answer {
        response.extend(graph::extract_response_claims(answer, model)?);
    }
    let gold_texts = gold
        .viewpoints
        .iter()
        .map(|v| v.summary.clone())
        .collect::<Vec<_>>();
    let response_vectors = model.embed(&response)?;
    let gold_vectors = model.embed(&gold_texts)?;
    let vc_emb = if gold_vectors.is_empty() {
        None
    } else if response_vectors.is_empty() {
        Some(0.0)
    } else {
        Some(
            gold_vectors
                .iter()
                .filter(|v| response_vectors.iter().any(|r| dot(v, r) >= 0.65))
                .count() as f32
                / gold_vectors.len() as f32,
        )
    };
    let retrieved_vectors = model.embed(
        &output
            .retrieved_chunks
            .iter()
            .map(|c| c.text.clone())
            .collect::<Vec<_>>(),
    )?;
    let ec_at_k = if gold_vectors.is_empty() {
        None
    } else if retrieved_vectors.is_empty() {
        Some(0.0)
    } else {
        Some(
            gold_vectors
                .iter()
                .filter(|v| retrieved_vectors.iter().any(|r| dot(v, r) >= 0.65))
                .count() as f32
                / gold_vectors.len() as f32,
        )
    };
    let svc = if gold_vectors.len() < 2 || response_vectors.is_empty() {
        None
    } else {
        let mut counts = vec![0usize; gold_vectors.len()];
        for r in &response_vectors {
            let best = gold_vectors
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| dot(r, a).total_cmp(&dot(r, b)))
                .unwrap()
                .0;
            counts[best] += 1;
        }
        let entropy = counts
            .iter()
            .filter(|&&n| n > 0)
            .map(|&n| {
                let p = n as f32 / response_vectors.len() as f32;
                -p * p.ln()
            })
            .sum::<f32>();
        Some(1.0 - entropy / (gold_vectors.len() as f32).ln())
    };
    let response_claims = response
        .iter()
        .enumerate()
        .map(|(i, text)| Claim {
            id: format!("r{i}"),
            text: text.clone(),
            doc_id: String::new(),
            chunk_id: String::new(),
            year: None,
        })
        .collect::<Vec<_>>();
    let predicted = graph::build_edges(&response_claims, model, 0.35)?;
    let cr = if gold.contradictions.is_empty() {
        None
    } else {
        let mut recovered = 0;
        for pair in &gold.contradictions {
            let gold_vectors = model.embed(&[pair.left.clone(), pair.right.clone()])?;
            let found = predicted
                .iter()
                .filter(|edge| edge.label == "contradicts")
                .any(|edge| {
                    let Some(i) = edge
                        .source
                        .strip_prefix('r')
                        .and_then(|x| x.parse::<usize>().ok())
                    else {
                        return false;
                    };
                    let Some(j) = edge
                        .target
                        .strip_prefix('r')
                        .and_then(|x| x.parse::<usize>().ok())
                    else {
                        return false;
                    };
                    (dot(&gold_vectors[0], &response_vectors[i]) >= 0.65
                        && dot(&gold_vectors[1], &response_vectors[j]) >= 0.65)
                        || (dot(&gold_vectors[0], &response_vectors[j]) >= 0.65
                            && dot(&gold_vectors[1], &response_vectors[i]) >= 0.65)
                });
            if found {
                recovered += 1;
            }
        }
        Some(recovered as f32 / gold.contradictions.len() as f32)
    };
    let expected_tier: f32 = match gold.controversy_class.as_str() {
        "resolved" => 2.0,
        "emerging" | "stable" => 1.0,
        "polarized" => 0.0,
        _ => 1.0,
    };
    let tier_rank = |tier: &str| match tier {
        "high" => Some(2.0_f32),
        "medium" => Some(1.0_f32),
        "low" => Some(0.0_f32),
        _ => None,
    };
    let confidence_tiers = output
        .views
        .iter()
        .filter_map(|view| tier_rank(&view.confidence_tier))
        .collect::<Vec<_>>();
    let cce = if confidence_tiers.is_empty() {
        output
            .answer_confidence
            .as_deref()
            .and_then(tier_rank)
            .map(|tier| (tier - expected_tier).abs() / 2.0)
    } else {
        Some(
            confidence_tiers
                .iter()
                .map(|tier| (*tier - expected_tier).abs() / 2.0)
                .sum::<f32>()
                / confidence_tiers.len() as f32,
        )
    };
    let source_text: BTreeMap<_, _> = output
        .retrieved_chunks
        .iter()
        .map(|c| (c.id.as_str(), c.text.as_str()))
        .collect();
    let mut statements = Vec::new();
    if !output.views.is_empty() {
        for view in &output.views {
            let sources = view
                .sources
                .iter()
                .filter_map(|id| source_text.get(id.as_str()).copied())
                .collect::<Vec<_>>();
            for sentence in view
                .summary
                .split_terminator(['.', '?', '!'])
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                statements.push((sentence.to_owned(), sources.clone()));
            }
        }
    } else if let Some(answer) = &output.answer {
        for sentence in answer
            .split_terminator(['.', '?', '!'])
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            let sources = output
                .retrieved_chunks
                .iter()
                .filter(|c| sentence.contains(&format!("[{}]", c.id)))
                .map(|c| c.text.as_str())
                .collect::<Vec<_>>();
            statements.push((sentence.to_owned(), sources));
        }
    }
    let fs = if output.system == "closed-book" || statements.is_empty() {
        None
    } else {
        let mut supported = 0;
        for (statement, sources) in &statements {
            if sources.is_empty() {
                continue;
            }
            let evidence = sources.join("\n");
            let prompt = format!(
                "Does the evidence support this scientific claim? Return one word only: supports, contradicts, or neutral. Evidence: {evidence} Claim: {statement}"
            );
            let response = model.generate(&prompt)?.to_lowercase();
            if response
                .split(|c: char| !c.is_alphabetic())
                .any(|word| word == "supports")
            {
                supported += 1;
            }
        }
        Some(supported as f32 / statements.len() as f32)
    };
    Ok(Scores {
        id: gold.id.clone(),
        vc_emb,
        svc,
        cr,
        cce,
        ec_at_k,
        fs,
    })
}

#[derive(Serialize)]
pub struct Interval {
    pub mean: f32,
    pub low: f32,
    pub high: f32,
    pub n: usize,
}

pub fn bootstrap(values: &[f32], iterations: usize) -> Option<Interval> {
    if values.is_empty() {
        return None;
    }
    let mut rng = StdRng::seed_from_u64(0);
    let mut means = (0..iterations)
        .map(|_| {
            (0..values.len())
                .map(|_| values[rng.random_range(0..values.len())])
                .sum::<f32>()
                / values.len() as f32
        })
        .collect::<Vec<_>>();
    means.sort_by(f32::total_cmp);
    Some(Interval {
        mean: values.iter().sum::<f32>() / values.len() as f32,
        low: means[((iterations as f32 * 0.025) as usize).min(iterations - 1)],
        high: means[((iterations as f32 * 0.975) as usize).min(iterations - 1)],
        n: values.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn constant_bootstrap() {
        let ci = bootstrap(&[0.5, 0.5], 100).unwrap();
        assert_eq!((ci.low, ci.high), (0.5, 0.5));
    }

    #[test]
    fn exact_signed_rank_for_three_positive_differences() {
        let result = paired_wilcoxon(&[1.0, 2.0, 3.0], &[0.0, 0.0, 0.0], 1).unwrap();
        assert_eq!(result.p_adjusted, 0.25);
    }
}
