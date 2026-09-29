#!/usr/bin/env bash
set -euo pipefail

EVI=${EVI:-target/debug/evirag-bench}
SMOKE_MODEL=${SMOKE_MODEL:-qwen2.5:0.5b}

command -v jq >/dev/null
./scripts/smoke.sh
for system in vanilla structured; do
  "$EVI" --model "$SMOKE_MODEL" --embed-model all-minilm run \
    data/smoke/index.json data/smoke/queries.jsonl "runs/prelim.$system.jsonl" \
    --system "$system"
  "$EVI" --model "$SMOKE_MODEL" --embed-model all-minilm evaluate \
    "runs/prelim.$system.jsonl" data/smoke/gold.jsonl \
    "runs/prelim.$system.metrics.json"
done

jq -n \
  --slurpfile full runs/smoke.jsonl \
  --slurpfile vanilla runs/prelim.vanilla.jsonl \
  --slurpfile structured runs/prelim.structured.jsonl \
  --slurpfile gold data/smoke/gold.jsonl \
  --slurpfile fm runs/smoke.metrics.json \
  --slurpfile vm runs/prelim.vanilla.metrics.json \
  --slurpfile sm runs/prelim.structured.metrics.json '
  ($full[0]) as $f | ($gold[0]) as $g |
  {
    model: $f.model,
    question: $f.question,
    views: {
      full: ($f.views | length),
      gold: ($g.viewpoints | length)
    },
    contradiction_links: ($f.edges | map(select(.label == "contradicts")) | length),
    checks: {
      multiple_views: (($f.views | length) >= 2),
      cited_passages_resolve: ([$f.views[].sources[]] | all(. as $id | $f.retrieved | index($id) != null)),
      cross_document_conflict: (
        [$f.edges[] | select(.label == "contradicts") |
          .source as $a | .target as $b |
          ($f.claims | map(select(.id == $a)) | first | .doc_id) !=
          ($f.claims | map(select(.id == $b)) | first | .doc_id)] | any
      ),
      class_matches_gold: ($f.controversy_class == $g.controversy_class),
      cda7_matches_gold: (
        [$f.edges[].cda7 | select(. != null)] as $labels |
        [$g.contradictions[].cda7 | . as $label | $labels | index($label) != null] | all
      )
    },
    contradiction_recall: {
      full: $fm[0].per_query[0].cr,
      vanilla: $vm[0].per_query[0].cr,
      structured: $sm[0].per_query[0].cr
    },
    answers: {
      full: $f.answer,
      vanilla: $vanilla[0].answer,
      structured: $structured[0].answer
    }
  }' > runs/preliminary_check.json

jq '{model, question, views, contradiction_links, checks, contradiction_recall}' \
  runs/preliminary_check.json
jq -e '.checks.multiple_views and .checks.cited_passages_resolve and .checks.cross_document_conflict' \
  runs/preliminary_check.json >/dev/null
