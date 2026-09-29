use crate::{
    model::{Ollama, dot},
    types::Chunk,
};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};

#[derive(Serialize, Deserialize)]
pub struct Index {
    pub chunks: Vec<Chunk>,
    pub vectors: Vec<Vec<f32>>,
    pub embed_model: String,
}

impl Index {
    pub fn build(chunks: Vec<Chunk>, model: &Ollama) -> Result<Self> {
        let mut vectors = Vec::new();
        for batch in chunks.chunks(64) {
            vectors.extend(model.embed(&batch.iter().map(|c| c.text.clone()).collect::<Vec<_>>())?);
        }
        Ok(Self {
            chunks,
            vectors,
            embed_model: model.embed_model.clone(),
        })
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, serde_json::to_vec(self)?)?;
        Ok(())
    }

    pub fn load(path: &Path, model: &Ollama) -> Result<Self> {
        let index: Self = serde_json::from_slice(
            &fs::read(path).with_context(|| format!("reading {}", path.display()))?,
        )?;
        anyhow::ensure!(
            index.embed_model == model.embed_model,
            "index embedding model differs from requested model"
        );
        anyhow::ensure!(
            index.chunks.len() == index.vectors.len(),
            "index is corrupt"
        );
        Ok(index)
    }

    pub fn search(&self, query: &str, k: usize, model: &Ollama) -> Result<Vec<Chunk>> {
        let vector = model.embed(&[query.to_owned()])?.remove(0);
        let mut order: Vec<_> = (0..self.chunks.len()).collect();
        order.sort_by(|&a, &b| {
            dot(&vector, &self.vectors[b])
                .total_cmp(&dot(&vector, &self.vectors[a]))
                .then_with(|| a.cmp(&b))
        });
        Ok(order
            .into_iter()
            .take(k)
            .map(|i| self.chunks[i].clone())
            .collect())
    }
}

pub const ROLES: [(&str, usize, &str); 4] = [
    ("precision", 3, "direct empirical support"),
    ("recall", 5, "all relevant studies and reviews"),
    (
        "skeptic",
        4,
        "null results, criticism, and contradictory findings",
    ),
    (
        "counterfactual",
        3,
        "alternative explanations, populations, and minority positions",
    ),
];

pub fn retrieve_roles(index: &Index, question: &str, model: &Ollama) -> Result<Vec<Chunk>> {
    let mut found = HashMap::new();
    let mut order = Vec::new();
    for (_, budget, aim) in ROLES {
        let prompt = format!(
            "Write one short scientific search query for {aim} about: {question}. Return the query only."
        );
        let reformulation = model.generate(&prompt)?;
        let query = if reformulation.trim().is_empty() {
            question
        } else {
            reformulation.trim()
        };
        for chunk in index.search(query, budget, model)? {
            if !found.contains_key(&chunk.id) {
                order.push(chunk.id.clone());
            }
            found.insert(chunk.id.clone(), chunk);
        }
    }
    Ok(order
        .into_iter()
        .filter_map(|id| found.remove(&id))
        .collect())
}

pub fn precision_query(question: &str, model: &Ollama) -> Result<String> {
    let answer = model.generate(&format!("Retrieve the most directly relevant, high-confidence evidence for {question}. Return a search query only."))?;
    Ok(if answer.trim().is_empty() {
        question.to_owned()
    } else {
        answer.trim().to_owned()
    })
}

pub fn mmr(index: &Index, question: &str, k: usize, model: &Ollama) -> Result<Vec<Chunk>> {
    let query = model.embed(&[question.to_owned()])?.remove(0);
    let mut selected: Vec<usize> = Vec::new();
    let mut available = (0..index.chunks.len()).collect::<Vec<_>>();
    while selected.len() < k && !available.is_empty() {
        let best = available
            .iter()
            .enumerate()
            .max_by(|left, right| {
                let a = *left.1;
                let b = *right.1;
                let score = |i: usize| {
                    let relevance = dot(&query, &index.vectors[i]);
                    let redundancy = selected
                        .iter()
                        .map(|&j| dot(&index.vectors[i], &index.vectors[j]))
                        .fold(0.0_f32, f32::max);
                    0.5 * relevance - 0.5 * redundancy
                };
                score(a).total_cmp(&score(b)).then_with(|| b.cmp(&a))
            })
            .map(|(position, _)| position)
            .unwrap();
        selected.push(available.remove(best));
    }
    Ok(selected
        .into_iter()
        .map(|i| index.chunks[i].clone())
        .collect())
}
