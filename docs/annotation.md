# Benchmark annotation protocol

Build the benchmark from five domains with 250 questions each. Keep source IDs and independent human judgments alongside the final annotations.

1. Freeze corpus IDs and save each paper's DOI, title, year, venue, access date, and license. Mark full paper versus abstract.
2. Draft questions independently of system outputs. Keep 250 in each domain. Record the source papers behind each question.
3. Two annotators independently identify 2 to 4 distinct positions. Each needs a proposition and a passage ID. Distinguish positions by empirical conclusion, population, definition, or theoretical account.
4. Record 1 to 8 pairs of incompatible atomic claims per query. Label each pair methodological, population, temporal, operational, statistical, theoretical, or replication. Compatible claims are not contradictions.
5. Assign resolved, emerging, stable, or polarized after inspecting evidence over time. Record the rationale.
6. Adjudicate before any system run. Store both independent files, the final file, adjudication notes, annotator IDs, timestamps, and a checksum of the frozen final JSONL.
7. For the human study, sample 250 queries by domain and class. Blind response order. Three raters score epistemic completeness from 1 to 5 using the manuscript rubric. Save raw ratings and calculate agreement.

Use `data/schema.example.json` for field names. Check each source and disagreement judgment during adjudication.
