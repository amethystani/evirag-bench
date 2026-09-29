use anyhow::{Context, Result};
use reqwest::blocking::Client;
use serde_json::{Value, json};

pub struct Ollama {
    pub host: String,
    pub chat_model: String,
    pub embed_model: String,
    client: Client,
}

impl Ollama {
    pub fn new(host: String, chat_model: String, embed_model: String) -> Result<Self> {
        Ok(Self {
            host,
            chat_model,
            embed_model,
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(600))
                .build()?,
        })
    }

    pub fn generate(&self, prompt: &str) -> Result<String> {
        let url = format!("{}/api/generate", self.host.trim_end_matches('/'));
        let data: Value = self
            .client
            .post(url)
            .json(&json!({
                "model": self.chat_model, "prompt": prompt, "stream": false, "think": false,
            "options": {"temperature": 0, "num_predict": 256}
            }))
            .send()
            .context("Ollama generation request failed")?
            .error_for_status()?
            .json()?;
        data["response"]
            .as_str()
            .map(str::to_owned)
            .context("Ollama response lacks text")
    }

    pub fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }
        let url = format!("{}/api/embed", self.host.trim_end_matches('/'));
        let data: Value = self
            .client
            .post(url)
            .json(&json!({
                "model": self.embed_model, "input": texts, "truncate": false
            }))
            .send()
            .context("Ollama embedding request failed")?
            .error_for_status()?
            .json()?;
        let mut vectors: Vec<Vec<f32>> = serde_json::from_value(data["embeddings"].clone())
            .context("Ollama response lacks embeddings")?;
        anyhow::ensure!(vectors.len() == texts.len(), "embedding count mismatch");
        for vector in &mut vectors {
            normalize(vector);
        }
        Ok(vectors)
    }
}

pub fn normalize(v: &mut [f32]) {
    let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for x in v {
            *x /= norm;
        }
    }
}

pub fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b).map(|(x, y)| x * y).sum()
}
