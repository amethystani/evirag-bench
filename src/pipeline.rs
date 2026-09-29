use crate::{
    graph,
    model::{Ollama, dot, normalize},
    retrieval::{Index, mmr, precision_query, retrieve_roles},
    types::{Claim, Edge, Output, Query, View},
};
use anyhow::Result;
use std::collections::{BTreeMap, BTreeSet};

fn divergence(groups: &[Vec<String>], claims: &[Claim], model: &Ollama) -> Result<f32> {
    if groups.len() < 2 {
        return Ok(0.0);
    }
    let lookup: BTreeMap<_, _> = claims
        .iter()
        .map(|c| (c.id.as_str(), c.text.clone()))
        .collect();
    let mut centroids = Vec::new();
    for group in groups {
        let texts = group
            .iter()
            .filter_map(|id| lookup.get(id.as_str()).cloned())
            .collect::<Vec<_>>();
        let vectors = model.embed(&texts)?;
        let mut mean = vec![0.0; vectors[0].len()];
        for vector in &vectors {
            for (x, y) in mean.iter_mut().zip(vector) {
                *x += y;
            }
        }
        normalize(&mut mean);
        centroids.push(mean);
    }
    let mut distances = Vec::new();
    for i in 0..centroids.len() {
        for j in i + 1..centroids.len() {
            distances.push(1.0 - dot(&centroids[i], &centroids[j]));
        }
    }
    Ok(distances.iter().sum::<f32>() / distances.len() as f32)
}

fn polarization(groups: &[Vec<String>], edges: &[Edge]) -> f32 {
    if edges.is_empty() {
        return 0.0;
    }
    let membership: BTreeMap<_, _> = groups
        .iter()
        .enumerate()
        .flat_map(|(i, g)| g.iter().map(move |id| (id.as_str(), i)))
        .collect();
    let cross = edges
        .iter()
        .filter(|e| {
            e.label == "contradicts"
                && membership.get(e.source.as_str()) != membership.get(e.target.as_str())
        })
        .count();
    cross as f32 / edges.len() as f32
}

fn controversy(ed: f32, pi: f32) -> &'static str {
    if ed < 0.15 && pi < 0.3 {
        "resolved"
    } else if ed < 0.35 && pi < 0.4 {
        "emerging"
    } else if ed >= 0.35 && pi >= 0.4 {
        "polarized"
    } else {
        "stable"
    }
}

fn synthesize(
    question: &str,
    claims: &[Claim],
    edges: &[Edge],
    model: &Ollama,
) -> Result<(Vec<View>, f32, f32, String)> {
    let groups = graph::communities(claims, edges);
    let ed = divergence(&groups, claims, model)?;
    let pi = polarization(&groups, edges);
    let class = controversy(ed, pi);
    let lookup: BTreeMap<_, _> = claims.iter().map(|c| (c.id.as_str(), c)).collect();
    let mut views = Vec::new();
    for group in groups {
        let members = group
            .iter()
            .filter_map(|id| lookup.get(id.as_str()).copied())
            .collect::<Vec<_>>();
        let sources: BTreeSet<_> = members.iter().map(|c| c.chunk_id.clone()).collect();
        let evidence = members
            .iter()
            .map(|c| format!("[{}] {}", c.chunk_id, c.text))
            .collect::<Vec<_>>()
            .join("\n");
        let prompt = format!(
            "Question: {question}\nEvidence:\n{evidence}\nReturn a JSON object with three string fields: position, summary, weaknesses. Describe only this scientific position. Cite passage IDs in the summary. State a concrete limitation supported by the passages. Do not add unsupported facts."
        );
        let generated = model.generate(&prompt)?;
        let parsed = generated
            .find('{')
            .zip(generated.rfind('}'))
            .and_then(|(start, end)| {
                serde_json::from_str::<serde_json::Value>(&generated[start..=end]).ok()
            });
        let field = |name: &str| {
            parsed
                .as_ref()
                .and_then(|value| value[name].as_str())
                .filter(|text| !text.trim().is_empty())
                .map(str::to_owned)
        };
        let position = field("position")
            .filter(|text| text.split_whitespace().count() >= 3)
            .unwrap_or_else(|| members.first().map(|c| c.text.clone()).unwrap_or_default());
        let summary = field("summary").unwrap_or_else(|| generated.trim().to_owned());
        let weaknesses =
            field("weaknesses").unwrap_or_else(|| "Unclear from the retrieved passages.".into());
        let conflicts = edges
            .iter()
            .filter(|e| {
                e.label == "contradicts" && (group.contains(&e.source) || group.contains(&e.target))
            })
            .collect::<Vec<_>>();
        let causes = conflicts
            .iter()
            .filter_map(|e| e.cda7.as_ref().cloned())
            .collect::<BTreeSet<_>>();
        let supports = edges
            .iter()
            .filter(|e| {
                e.label == "supports" && group.contains(&e.source) && group.contains(&e.target)
            })
            .count();
        let diversity = members
            .iter()
            .map(|c| &c.doc_id)
            .collect::<BTreeSet<_>>()
            .len()
            .min(3);
        let severity = if conflicts.is_empty() {
            0.0
        } else {
            conflicts
                .iter()
                .map(|e| match e.cda7.as_deref() {
                    Some("replication") => 1.0,
                    Some("statistical" | "temporal") => 0.8,
                    Some("methodological" | "operational") => 0.6,
                    Some("population" | "theoretical") => 0.5,
                    _ => 0.7,
                })
                .sum::<f32>()
                / conflicts.len() as f32
        };
        let newest = members.iter().filter_map(|c| c.year).max();
        let recent_conflicts = newest
            .map(|year| {
                conflicts
                    .iter()
                    .filter(|e| {
                        [&e.source, &e.target].iter().any(|id| {
                            lookup
                                .get(id.as_str())
                                .and_then(|c| c.year)
                                .is_some_and(|y| y >= year - 5)
                        })
                    })
                    .count()
            })
            .unwrap_or(0);
        let temporal_stability = if newest.is_none() {
            0.5
        } else {
            1.0 / (1.0 + recent_conflicts as f32)
        };
        let agreement = (supports as f32 + 1.0) / (supports + conflicts.len() + 1) as f32;
        let provenance = members.iter().filter(|c| !c.chunk_id.is_empty()).count() as f32
            / members.len().max(1) as f32;
        let class_factor = match class {
            "polarized" => 0.75,
            "stable" => 0.85,
            "emerging" => 0.9,
            _ => 1.0,
        };
        let confidence = ((0.25 * agreement
            + 0.25 * diversity as f32 / 3.0
            + 0.2 * (1.0 - severity)
            + 0.15 * temporal_stability
            + 0.15 * provenance)
            * class_factor)
            .clamp(0.0, 1.0);
        let confidence_tier = if confidence >= 0.75 {
            "high"
        } else if confidence >= 0.45 {
            "medium"
        } else {
            "low"
        };
        views.push(View {
            claim_ids: group,
            position,
            summary,
            weaknesses,
            sources: sources.into_iter().collect(),
            disagreement_causes: causes.into_iter().collect(),
            confidence,
            confidence_tier: confidence_tier.into(),
        });
    }
    Ok((views, ed, pi, class.into()))
}

fn render_views(
    question: &str,
    class: &str,
    views: &[View],
    temporal: &BTreeMap<i32, (usize, usize)>,
) -> String {
    let mut text = format!("Question: {question}\nControversy: {class}\n");
    for (i, view) in views.iter().enumerate() {
        text.push_str(&format!(
            "\nView {} [{} sources, confidence: {}]\n",
            i + 1,
            view.sources.len(),
            view.confidence_tier
        ));
        text.push_str(&format!(
            "Position: {}\nEvidence: {}\nWeaknesses: {}\n",
            view.position, view.summary, view.weaknesses
        ));
        if !view.disagreement_causes.is_empty() {
            text.push_str(&format!(
                "Why sources disagree: {}\n",
                view.disagreement_causes.join(", ")
            ));
        }
        text.push_str(&format!("Passages: {}\n", view.sources.join(", ")));
    }
    if !temporal.is_empty() {
        text.push_str("\nTemporal evidence:\n");
        for (year, (claims, conflicts)) in temporal {
            text.push_str(&format!(
                "{year}: {claims} claims, {conflicts} contradiction links\n"
            ));
        }
    }
    text
}

pub fn run(
    query: &Query,
    index: &Index,
    model: &Ollama,
    system: &str,
    intent_override: Option<&str>,
) -> Result<Output> {
    let intent = if ["full", "no-graph", "no-multi-view"].contains(&system) {
        if let Some(value) = intent_override {
            value.to_owned()
        } else {
            let prompt = format!(
                "Is this scientific question likely to have materially competing research findings? Return exactly contested or resolved. Question: {}",
                query.question
            );
            let answer = model.generate(&prompt)?.to_lowercase();
            if answer.trim().starts_with("resolved") {
                "resolved".into()
            } else {
                "contested".into()
            }
        }
    } else {
        String::new()
    };
    let chunks = match system {
        "full" | "no-graph" | "no-multi-view" if intent == "resolved" => {
            index.search(&precision_query(&query.question, model)?, 10, model)?
        }
        "full" | "no-graph" | "no-multi-view" => retrieve_roles(index, &query.question, model)?,
        "closed-book" => Vec::new(),
        "single-agent" => index.search(&precision_query(&query.question, model)?, 10, model)?,
        "mmr" => mmr(index, &query.question, 10, model)?,
        "vanilla" => index.search(&query.question, 10, model)?,
        "vanilla-15" | "structured" => index.search(&query.question, 15, model)?,
        _ => anyhow::bail!("unknown system {system}"),
    };
    let retrieved = chunks.iter().map(|c| c.id.clone()).collect();
    if intent == "resolved" {
        let evidence = chunks
            .iter()
            .map(|c| format!("[{}] {}", c.id, c.text))
            .collect::<Vec<_>>()
            .join("\n");
        let answer = model.generate(&format!("Answer this scientific question concisely using only the passages. Cite passage IDs and state the strength of evidence. Passages: {evidence} Question: {}", query.question))?;
        return Ok(Output {
            id: query.id.clone(),
            question: query.question.clone(),
            system: system.into(),
            model: model.chat_model.clone(),
            embedding_model: model.embed_model.clone(),
            answer: Some(answer),
            answer_confidence: Some("high".into()),
            intent_label: Some(intent),
            views: Vec::new(),
            claims: Vec::new(),
            edges: Vec::new(),
            retrieved,
            retrieved_chunks: chunks,
            controversy_class: Some("resolved".into()),
            epistemic_divergence: Some(0.0),
            polarization_index: Some(0.0),
            temporal_curve: None,
        });
    }
    if system == "no-graph" || !["full", "no-multi-view"].contains(&system) {
        let evidence = chunks
            .iter()
            .map(|c| format!("[{}] {}", c.id, c.text))
            .collect::<Vec<_>>()
            .join("\n");
        let prompt = match system {
            "closed-book" => format!(
                "Answer the following scientific question. If the research literature is divided on it, say so and describe the positions: {}",
                query.question
            ),
            "structured" | "no-graph" => format!(
                "You are summarizing a contested scientific literature. Using only the passages below: (1) identify every distinct viewpoint the passages support; (2) for each viewpoint, give the supporting evidence and cite the passage; (3) for each viewpoint, state its weaknesses or limitations; (4) explain why the sources disagree with each other; (5) state your confidence and what would change it. Do not resolve the disagreement into a single answer. Passages: {evidence} Question: {}",
                query.question
            ),
            _ => format!(
                "Based on the following passages, answer the question concisely and accurately: {evidence} Question: {}",
                query.question
            ),
        };
        let answer = model.generate(&prompt)?;
        return Ok(Output {
            id: query.id.clone(),
            question: query.question.clone(),
            system: system.into(),
            model: model.chat_model.clone(),
            embedding_model: model.embed_model.clone(),
            answer: Some(answer),
            answer_confidence: None,
            intent_label: if intent.is_empty() {
                None
            } else {
                Some(intent.clone())
            },
            views: Vec::new(),
            claims: Vec::new(),
            edges: Vec::new(),
            retrieved,
            retrieved_chunks: chunks,
            controversy_class: None,
            epistemic_divergence: None,
            polarization_index: None,
            temporal_curve: None,
        });
    }
    let claims = graph::extract_claims(&chunks, model)?;
    anyhow::ensure!(
        !claims.is_empty(),
        "claim extraction returned no claims for {}",
        query.id
    );
    let edges = graph::build_edges(&claims, model, 0.35)?;
    let temporal_curve = graph::temporal_curve(&claims, &edges);
    let (views, ed, pi, class) = synthesize(&query.question, &claims, &edges, model)?;
    let (answer, views) = if system == "no-multi-view" {
        let evidence = views
            .iter()
            .map(|v| v.summary.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        let answer = model.generate(&format!("Based on these analyzed views, write one concise answer to the question. Question: {} Views: {evidence}", query.question))?;
        (Some(answer), Vec::new())
    } else {
        (
            Some(render_views(
                &query.question,
                &class,
                &views,
                &temporal_curve,
            )),
            views,
        )
    };
    Ok(Output {
        id: query.id.clone(),
        question: query.question.clone(),
        system: system.into(),
        model: model.chat_model.clone(),
        embedding_model: model.embed_model.clone(),
        answer,
        answer_confidence: None,
        intent_label: Some(intent),
        views,
        claims,
        edges,
        retrieved,
        retrieved_chunks: chunks,
        controversy_class: Some(class),
        epistemic_divergence: Some(ed),
        polarization_index: Some(pi),
        temporal_curve: Some(temporal_curve),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn typology_boundaries() {
        assert_eq!(controversy(0.1, 0.1), "resolved");
        assert_eq!(controversy(0.2, 0.2), "emerging");
        assert_eq!(controversy(0.4, 0.2), "stable");
        assert_eq!(controversy(0.4, 0.5), "polarized");
    }
}
