use crate::types::{Chunk, Document, Section};
use anyhow::{Context, Result};
use serde::{Serialize, de::DeserializeOwned};
use std::{
    fs::File,
    io::{BufRead, BufReader, BufWriter, Write},
    path::Path,
};
use tokenizers::Tokenizer;

pub fn load_tokenizer(path: &Path) -> Result<Tokenizer> {
    if !path.exists() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let url = "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/3746fd5f4cfd46ae64fc781df53e7cbb7849eb62/tokenizer.json";
        let bytes = reqwest::blocking::get(url)?.error_for_status()?.bytes()?;
        std::fs::write(path, bytes)?;
    }
    let mut tokenizer = Tokenizer::from_file(path)
        .map_err(|error| anyhow::anyhow!("loading {}: {error}", path.display()))?;
    tokenizer
        .with_truncation(None)
        .map_err(|error| anyhow::anyhow!("configuring tokenizer: {error}"))?;
    tokenizer.with_padding(None);
    Ok(tokenizer)
}

pub fn chunk_documents_tokenized(
    documents: &[Document],
    size: usize,
    overlap: usize,
    tokenizer: &Tokenizer,
) -> Result<Vec<Chunk>> {
    anyhow::ensure!(size > 0 && overlap < size, "require 0 <= overlap < size");
    let mut chunks = Vec::new();
    for doc in documents {
        let fallback = [Section {
            heading: "body".into(),
            text: doc.text.clone(),
        }];
        for (section_index, section) in doc
            .sections
            .as_deref()
            .unwrap_or(&fallback)
            .iter()
            .enumerate()
        {
            let encoding = tokenizer
                .encode(section.text.as_str(), false)
                .map_err(|error| anyhow::anyhow!("tokenizing {}: {error}", doc.id))?;
            let offsets = encoding.get_offsets();
            for start in (0..offsets.len()).step_by(size - overlap) {
                let end = offsets.len().min(start + size);
                let start_byte = offsets[start].0;
                let end_byte = offsets[end - 1].1;
                if start_byte == end_byte {
                    continue;
                }
                chunks.push(Chunk {
                    id: format!("{}:{section_index}:{start}", doc.id),
                    doc_id: doc.id.clone(),
                    text: section.text[start_byte..end_byte].to_owned(),
                    title: doc.title.clone(),
                    year: doc.year,
                    section: section.heading.clone(),
                    start_token: start,
                });
            }
        }
    }
    Ok(chunks)
}

pub fn fetch_openalex(path: &Path, per_domain: usize) -> Result<()> {
    let searches = [
        ("education", "homework academic achievement"),
        ("biomedicine", "statins primary prevention cardiovascular"),
        ("economics", "minimum wage employment"),
        ("nutrition", "saturated fat cardiovascular disease"),
        ("earth_sciences", "climate sensitivity estimates"),
    ];
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()?;
    let api_key = std::env::var("OPENALEX_API_KEY").ok();
    let mut rows = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for (domain, search) in searches {
        let mut cursor = "*".to_owned();
        let mut count = 0;
        while count < per_domain {
            let mut request = client.get("https://api.openalex.org/works").query(&[
                ("search", search),
                ("filter", "has_abstract:true,type:article"),
                ("per-page", "100"),
                ("cursor", &cursor),
            ]);
            if let Some(key) = &api_key {
                request = request.bearer_auth(key);
            }
            let response = request.send()?;
            if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                anyhow::bail!(
                    "OpenAlex returned 429. Set OPENALEX_API_KEY to a free key and retry after the rate limit resets"
                );
            }
            let result: serde_json::Value = response.error_for_status()?.json()?;
            let Some(works) = result["results"].as_array() else {
                break;
            };
            if works.is_empty() {
                break;
            }
            for work in works {
                let Some(id) = work["id"].as_str() else {
                    continue;
                };
                if !seen.insert(id.to_owned()) {
                    continue;
                }
                let Some(index) = work["abstract_inverted_index"].as_object() else {
                    continue;
                };
                let mut words = Vec::new();
                for (word, positions) in index {
                    if let Some(positions) = positions.as_array() {
                        for position in positions {
                            if let Some(i) = position.as_u64() {
                                words.push((i, word.as_str()));
                            }
                        }
                    }
                }
                words.sort_by_key(|(i, _)| *i);
                let text = words
                    .iter()
                    .map(|(_, word)| *word)
                    .collect::<Vec<_>>()
                    .join(" ");
                if text.is_empty() {
                    continue;
                }
                rows.push(Document {
                    id: id.rsplit('/').next().unwrap_or(id).into(),
                    title: work["title"].as_str().unwrap_or("").into(),
                    text,
                    year: work["publication_year"].as_i64().map(|n| n as i32),
                    venue: work["primary_location"]["source"]["display_name"]
                        .as_str()
                        .map(str::to_owned),
                    domain: Some(domain.into()),
                    doi: work["doi"].as_str().map(str::to_owned),
                    sections: None,
                });
                count += 1;
                if count == per_domain {
                    break;
                }
            }
            cursor = result["meta"]["next_cursor"]
                .as_str()
                .unwrap_or("")
                .to_owned();
            if cursor.is_empty() {
                break;
            }
        }
        println!("{domain}: {count}/{per_domain}");
    }
    write_jsonl(path, &rows)
}

pub fn read_jsonl<T: DeserializeOwned>(path: &Path) -> Result<Vec<T>> {
    let file = File::open(path).with_context(|| format!("opening {}", path.display()))?;
    BufReader::new(file)
        .lines()
        .enumerate()
        .filter_map(|(i, line)| match line {
            Ok(line) if line.trim().is_empty() => None,
            other => Some((i + 1, other)),
        })
        .map(|(line_no, line)| {
            let line = line?;
            serde_json::from_str(&line).with_context(|| format!("{}:{line_no}", path.display()))
        })
        .collect()
}

pub fn write_jsonl<T: Serialize>(path: &Path, rows: &[T]) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = BufWriter::new(File::create(path)?);
    for row in rows {
        serde_json::to_writer(&mut file, row)?;
        writeln!(file)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ahash::AHashMap;
    use tokenizers::{models::wordlevel::WordLevel, pre_tokenizers::whitespace::Whitespace};
    #[test]
    fn overlap_is_exact() {
        let doc = Document {
            id: "d".into(),
            title: "t".into(),
            text: "one two three four five six seven".into(),
            year: None,
            venue: None,
            domain: None,
            doi: None,
            sections: None,
        };
        let vocab = [
            "[UNK]", "one", "two", "three", "four", "five", "six", "seven",
        ]
        .into_iter()
        .enumerate()
        .map(|(i, word)| (word.to_string(), i as u32))
        .collect::<AHashMap<_, _>>();
        let model = WordLevel::builder()
            .vocab(vocab)
            .unk_token("[UNK]".into())
            .build()
            .unwrap();
        let mut tokenizer = Tokenizer::new(model);
        tokenizer.with_pre_tokenizer(Some(Whitespace));
        let chunks = chunk_documents_tokenized(&[doc], 4, 1, &tokenizer).unwrap();
        assert_eq!(chunks[0].text, "one two three four");
        assert_eq!(chunks[1].text, "four five six seven");
    }
}
