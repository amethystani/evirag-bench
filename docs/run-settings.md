# Run settings

| Component | Setting |
| --- | --- |
| Chunking | 256 MiniLM wordpiece tokens, overlap 32, within supplied sections |
| Embeddings | Ollama `all-minilm`, normalized before similarity and centroid calculations |
| Chat model | Ollama `qwen3.6:35b-a3b`, deterministic generation, thinking disabled |
| Retrieval roles | Precision 3, Recall 5, Skeptic 4, Counterfactual 3 |
| Claim pairs | Cosine candidate threshold 0.35, three-way relation label |
| Communities | Signed modularity, local node moves, graph aggregation |
| Coverage | Gold viewpoint cosine threshold 0.65 |
| Concentration | One minus normalized Shannon entropy over nearest gold views |
| Retrieval coverage | Gold viewpoints matched in retrieved passages at 0.65 |
| Contradiction recall | Gold claim pairs matched to contradictory output claim pairs at 0.65 |
| Calibration | Mean tier distance: resolved to high, emerging or stable to medium, polarized to low |
| Faithfulness | Fraction of response statements supported by their source passages |
| Intervals | 2,000 bootstrap resamples with fixed seed |
| Paired comparisons | Two-sided Wilcoxon signed-rank with Bonferroni adjustment |

The output records model names, retrieved passages, atomic claims, graph edges, source IDs, temporal counts, and each view's confidence signal. Save model digests and the input file checksums with an experiment run.
