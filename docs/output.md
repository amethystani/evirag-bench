# Answer format

The `answer` field in each full-system JSONL record uses this layout:

```text
Question: <query>
Controversy: <resolved | emerging | stable | polarized>

View 1 [<source count> sources, confidence: <high | medium | low>]
Position: <one checkable position>
Evidence: <source-grounded summary with passage citations>
Weaknesses: <limitations of the evidence>
Why sources disagree: <CDA-7 causes, when conflict links exist>
Passages: <chunk IDs>

Temporal evidence:
<year>: <claim count> claims, <contradiction count> contradiction links
```

The JSON record also stores each view separately, the atomic claims, graph edges, retrieved passages, model names, and the temporal curve. Source IDs in the answer resolve through `retrieved_chunks`.
