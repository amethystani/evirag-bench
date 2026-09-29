use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub text: String,
    pub year: Option<i32>,
    pub venue: Option<String>,
    pub domain: Option<String>,
    pub doi: Option<String>,
    pub sections: Option<Vec<Section>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Section {
    pub heading: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    pub id: String,
    pub doc_id: String,
    pub text: String,
    pub title: String,
    pub year: Option<i32>,
    pub section: String,
    pub start_token: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Query {
    pub id: String,
    pub domain: String,
    pub question: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claim {
    pub id: String,
    pub text: String,
    pub doc_id: String,
    pub chunk_id: String,
    pub year: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub source: String,
    pub target: String,
    pub label: String,
    pub cda7: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct View {
    pub claim_ids: Vec<String>,
    pub position: String,
    pub summary: String,
    pub weaknesses: String,
    pub sources: Vec<String>,
    pub disagreement_causes: Vec<String>,
    pub confidence: f32,
    pub confidence_tier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Output {
    pub id: String,
    pub question: String,
    pub system: String,
    pub model: String,
    pub embedding_model: String,
    pub answer: Option<String>,
    pub answer_confidence: Option<String>,
    pub intent_label: Option<String>,
    pub views: Vec<View>,
    pub claims: Vec<Claim>,
    pub edges: Vec<Edge>,
    pub retrieved: Vec<String>,
    #[serde(default)]
    pub retrieved_chunks: Vec<Chunk>,
    pub controversy_class: Option<String>,
    pub epistemic_divergence: Option<f32>,
    pub polarization_index: Option<f32>,
    pub temporal_curve: Option<std::collections::BTreeMap<i32, (usize, usize)>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoldView {
    pub id: String,
    pub summary: String,
    pub sources: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoldPair {
    pub left: String,
    pub right: String,
    pub cda7: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoldQuery {
    pub id: String,
    pub domain: String,
    pub question: String,
    pub viewpoints: Vec<GoldView>,
    pub contradictions: Vec<GoldPair>,
    pub controversy_class: String,
}
