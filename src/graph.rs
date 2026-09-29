use crate::{
    model::{Ollama, dot},
    types::{Chunk, Claim, Edge},
};
use anyhow::Result;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub const CDA7: [&str; 7] = [
    "methodological",
    "population",
    "temporal",
    "operational",
    "statistical",
    "theoretical",
    "replication",
];

fn json_array(text: &str) -> Option<Vec<String>> {
    let start = text.find('[')?;
    let end = text.rfind(']')?;
    let value: Value = serde_json::from_str(&text[start..=end]).ok()?;
    Some(
        value
            .as_array()?
            .iter()
            .filter_map(|v| v.as_str().map(str::to_owned))
            .take(5)
            .collect(),
    )
}

fn sentence_claims(text: &str) -> Vec<String> {
    text.split_terminator(['.', '?', '!'])
        .map(str::trim)
        .filter(|s| s.split_whitespace().count() >= 4)
        .take(5)
        .map(str::to_owned)
        .collect()
}

pub fn extract_claims(chunks: &[Chunk], model: &Ollama) -> Result<Vec<Claim>> {
    let mut claims = Vec::new();
    for chunk in chunks {
        let prompt = format!(
            "Extract at most five atomic, checkable scientific claims supported by this passage. Return a JSON array of strings only. Passage: {}",
            chunk.text
        );
        let response = model.generate(&prompt)?;
        let extracted = json_array(&response)
            .filter(|items| !items.is_empty())
            .unwrap_or_else(|| sentence_claims(&chunk.text));
        let mut seen = BTreeSet::new();
        for text in extracted {
            if text.trim().is_empty() || !seen.insert(text.trim().to_lowercase()) {
                continue;
            }
            claims.push(Claim {
                id: format!("c{}", claims.len()),
                text,
                doc_id: chunk.doc_id.clone(),
                chunk_id: chunk.id.clone(),
                year: chunk.year,
            });
        }
    }
    Ok(claims)
}

pub fn extract_response_claims(text: &str, model: &Ollama) -> Result<Vec<String>> {
    let prompt = format!(
        "Extract atomic, checkable scientific claims asserted in this answer. Return a JSON array of strings only. Answer: {text}"
    );
    let response = model.generate(&prompt)?;
    Ok(json_array(&response)
        .filter(|claims| !claims.is_empty())
        .unwrap_or_else(|| sentence_claims(text)))
}

fn first_label(text: &str, labels: &[&str]) -> Option<String> {
    let lower = text.to_lowercase();
    lower
        .split(|c: char| !c.is_alphabetic())
        .find(|word| labels.contains(word))
        .map(str::to_owned)
}

pub fn build_edges(claims: &[Claim], model: &Ollama, threshold: f32) -> Result<Vec<Edge>> {
    let vectors = model.embed(&claims.iter().map(|c| c.text.clone()).collect::<Vec<_>>())?;
    let mut edges = Vec::new();
    for i in 0..claims.len() {
        for j in i + 1..claims.len() {
            if !claims[i].chunk_id.is_empty() && claims[i].chunk_id == claims[j].chunk_id {
                continue;
            }
            if dot(&vectors[i], &vectors[j]) < threshold {
                continue;
            }
            let prompt = format!(
                "Compare these scientific claims. Return one word only: supports, contradicts, or neutral. Use contradicts only for incompatible claims about comparable outcomes. A: {} B: {}",
                claims[i].text, claims[j].text
            );
            let label = first_label(
                &model.generate(&prompt)?,
                &["supports", "contradicts", "neutral"],
            )
            .unwrap_or("neutral".into());
            if label == "neutral" {
                continue;
            }
            let cda7 = if label == "contradicts" {
                let prompt = format!(
                    "Choose the main reason these scientific claims disagree. Return one word only: {}. A: {} B: {}",
                    CDA7.join(", "),
                    claims[i].text,
                    claims[j].text
                );
                first_label(&model.generate(&prompt)?, &CDA7)
            } else {
                None
            };
            edges.push(Edge {
                source: claims[i].id.clone(),
                target: claims[j].id.clone(),
                label,
                cda7,
            });
        }
    }
    Ok(edges)
}

pub fn communities(claims: &[Claim], edges: &[Edge]) -> Vec<Vec<String>> {
    let n = claims.len();
    if n == 0 {
        return Vec::new();
    }
    let ids: BTreeMap<_, _> = claims
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.as_str(), i))
        .collect();
    let mut graph = SignedGraph {
        positive: vec![vec![0.0; n]; n],
        negative: vec![vec![0.0; n]; n],
        members: (0..n).map(|i| vec![i]).collect(),
    };
    for edge in edges {
        let (Some(&i), Some(&j)) = (ids.get(edge.source.as_str()), ids.get(edge.target.as_str()))
        else {
            continue;
        };
        if i == j {
            continue;
        }
        let layer = if edge.label == "supports" {
            &mut graph.positive
        } else if edge.label == "contradicts" {
            &mut graph.negative
        } else {
            continue;
        };
        layer[i][j] += 1.0;
        layer[j][i] += 1.0;
    }
    for _ in 0..n {
        let partition = graph.move_phase();
        let count = partition.iter().copied().collect::<BTreeSet<_>>().len();
        if count == graph.members.len() {
            break;
        }
        graph = graph.aggregate(&partition);
    }
    let mut groups = graph
        .members
        .into_iter()
        .map(|members| {
            members
                .into_iter()
                .map(|i| claims[i].id.clone())
                .collect::<Vec<_>>()
        })
        .collect::<Vec<_>>();
    groups.sort_by_key(|g| {
        g.iter()
            .filter_map(|id| ids.get(id.as_str()))
            .min()
            .copied()
            .unwrap_or(usize::MAX)
    });
    groups
}

struct SignedGraph {
    positive: Vec<Vec<f64>>,
    negative: Vec<Vec<f64>>,
    members: Vec<Vec<usize>>,
}

#[derive(Default)]
struct CommunityStats {
    positive_degree: f64,
    negative_degree: f64,
    positive_links: f64,
    negative_links: f64,
}

impl SignedGraph {
    fn modularity(&self, partition: &[usize]) -> f64 {
        let n = partition.len();
        let kp = (0..n)
            .map(|i| self.positive[i].iter().sum::<f64>())
            .collect::<Vec<_>>();
        let kn = (0..n)
            .map(|i| self.negative[i].iter().sum::<f64>())
            .collect::<Vec<_>>();
        let mp = kp.iter().sum::<f64>();
        let mn = kn.iter().sum::<f64>();
        if mp + mn == 0.0 {
            return 0.0;
        }
        let mut sum = 0.0;
        for i in 0..n {
            for j in 0..n {
                if partition[i] != partition[j] {
                    continue;
                }
                sum += self.positive[i][j] - self.negative[i][j];
                if mp > 0.0 {
                    sum -= kp[i] * kp[j] / mp;
                }
                if mn > 0.0 {
                    sum += kn[i] * kn[j] / mn;
                }
            }
        }
        sum / (mp + mn)
    }

    fn move_phase(&self) -> Vec<usize> {
        let n = self.members.len();
        let mut partition = (0..n).collect::<Vec<_>>();
        let kp = (0..n)
            .map(|i| self.positive[i].iter().sum::<f64>())
            .collect::<Vec<_>>();
        let kn = (0..n)
            .map(|i| self.negative[i].iter().sum::<f64>())
            .collect::<Vec<_>>();
        let mp = kp.iter().sum::<f64>();
        let mn = kn.iter().sum::<f64>();
        if mp + mn == 0.0 {
            return partition;
        }
        for _ in 0..(n * 4).max(1) {
            let before = self.modularity(&partition);
            let mut moved = false;
            for node in 0..n {
                let original = partition[node];
                let mut best = original;
                let mut best_gain = 0.0;
                let mut stats: BTreeMap<usize, CommunityStats> = BTreeMap::new();
                for j in 0..n {
                    let entry = stats.entry(partition[j]).or_default();
                    entry.positive_degree += kp[j];
                    entry.negative_degree += kn[j];
                    if j != node {
                        entry.positive_links += self.positive[node][j];
                        entry.negative_links += self.negative[node][j];
                    }
                }
                let source = &stats[&original];
                let mut candidates = stats.keys().copied().collect::<BTreeSet<_>>();
                candidates.insert(n + node);
                for candidate in candidates {
                    if candidate == original {
                        continue;
                    }
                    let empty = CommunityStats::default();
                    let target = stats.get(&candidate).unwrap_or(&empty);
                    let edge_gain = 2.0
                        * (target.positive_links - source.positive_links - target.negative_links
                            + source.negative_links);
                    let positive_gain = if mp > 0.0 {
                        -((source.positive_degree - kp[node]).powi(2)
                            + (target.positive_degree + kp[node]).powi(2)
                            - source.positive_degree.powi(2)
                            - target.positive_degree.powi(2))
                            / mp
                    } else {
                        0.0
                    };
                    let negative_gain = if mn > 0.0 {
                        ((source.negative_degree - kn[node]).powi(2)
                            + (target.negative_degree + kn[node]).powi(2)
                            - source.negative_degree.powi(2)
                            - target.negative_degree.powi(2))
                            / mn
                    } else {
                        0.0
                    };
                    let gain = (edge_gain + positive_gain + negative_gain) / (mp + mn);
                    if gain > best_gain + 1e-10 {
                        best = candidate;
                        best_gain = gain;
                    }
                }
                partition[node] = best;
                moved |= best != original;
            }
            debug_assert!(self.modularity(&partition) + 1e-8 >= before);
            if !moved {
                break;
            }
        }
        partition
    }

    fn aggregate(&self, partition: &[usize]) -> Self {
        let labels = partition.iter().copied().collect::<BTreeSet<_>>();
        let positions = labels
            .into_iter()
            .enumerate()
            .map(|(i, label)| (label, i))
            .collect::<BTreeMap<_, _>>();
        let n = positions.len();
        let mut next = Self {
            positive: vec![vec![0.0; n]; n],
            negative: vec![vec![0.0; n]; n],
            members: vec![Vec::new(); n],
        };
        for (i, label) in partition.iter().enumerate() {
            let a = positions[label];
            next.members[a].extend_from_slice(&self.members[i]);
            for (j, other) in partition.iter().enumerate() {
                let b = positions[other];
                next.positive[a][b] += self.positive[i][j];
                next.negative[a][b] += self.negative[i][j];
            }
        }
        next
    }
}

pub fn temporal_curve(claims: &[Claim], edges: &[Edge]) -> BTreeMap<i32, (usize, usize)> {
    let lookup: BTreeMap<_, _> = claims.iter().map(|c| (c.id.as_str(), c.year)).collect();
    let mut years = BTreeMap::new();
    for claim in claims {
        if let Some(year) = claim.year {
            years.entry(year).or_insert((0, 0)).0 += 1;
        }
    }
    for edge in edges.iter().filter(|e| e.label == "contradicts") {
        let mut affected = BTreeSet::new();
        for id in [&edge.source, &edge.target] {
            if let Some(Some(year)) = lookup.get(id.as_str()) {
                affected.insert(*year);
            }
        }
        for year in affected {
            years.entry(year).or_insert((0, 0)).1 += 1;
        }
    }
    years
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn signed_partition_separates_conflict() {
        let claims = (0..3)
            .map(|i| Claim {
                id: format!("c{i}"),
                text: String::new(),
                doc_id: String::new(),
                chunk_id: String::new(),
                year: None,
            })
            .collect::<Vec<_>>();
        let edges = vec![
            Edge {
                source: "c0".into(),
                target: "c1".into(),
                label: "supports".into(),
                cda7: None,
            },
            Edge {
                source: "c0".into(),
                target: "c2".into(),
                label: "contradicts".into(),
                cda7: Some("population".into()),
            },
        ];
        let groups = communities(&claims, &edges);
        assert!(
            groups
                .iter()
                .any(|g| g.contains(&"c0".into()) && g.contains(&"c1".into()))
        );
        assert!(
            !groups
                .iter()
                .any(|g| g.contains(&"c0".into()) && g.contains(&"c2".into()))
        );
    }

    #[test]
    fn signed_louvain_recovers_two_camps() {
        let claims = (0..6)
            .map(|i| Claim {
                id: format!("c{i}"),
                text: String::new(),
                doc_id: String::new(),
                chunk_id: String::new(),
                year: None,
            })
            .collect::<Vec<_>>();
        let mut edges = Vec::new();
        for i in 0..6 {
            for j in i + 1..6 {
                edges.push(Edge {
                    source: format!("c{i}"),
                    target: format!("c{j}"),
                    label: if i / 3 == j / 3 {
                        "supports"
                    } else {
                        "contradicts"
                    }
                    .into(),
                    cda7: None,
                });
            }
        }
        let groups = communities(&claims, &edges);
        assert_eq!(
            groups,
            vec![
                vec!["c0".to_string(), "c1".to_string(), "c2".to_string()],
                vec!["c3".to_string(), "c4".to_string(), "c5".to_string()]
            ]
        );
    }

    #[test]
    fn negative_star_groups_the_leaves() {
        let claims = (0..5)
            .map(|i| Claim {
                id: format!("c{i}"),
                text: String::new(),
                doc_id: String::new(),
                chunk_id: String::new(),
                year: None,
            })
            .collect::<Vec<_>>();
        let edges = (1..5)
            .map(|i| Edge {
                source: "c0".into(),
                target: format!("c{i}"),
                label: "contradicts".into(),
                cda7: None,
            })
            .collect::<Vec<_>>();
        assert_eq!(
            communities(&claims, &edges),
            vec![
                vec!["c0".to_string()],
                vec![
                    "c1".to_string(),
                    "c2".to_string(),
                    "c3".to_string(),
                    "c4".to_string()
                ]
            ]
        );
    }
}
