---
id: rag-document-search
title: Design a retrieval-augmented search system over company documents
level: senior
topics: [rag, embeddings, vector-search, chunking, access-control]
minutes: 45
---

## Prompt

A company wants an internal tool where employees ask questions in plain
English and get answers grounded in their internal documents: wikis, PDFs,
tickets. Design the system that retrieves relevant content and feeds it to an
LLM to generate an answer.

## Clarifications

- **Corpus size?** 2 million documents, averaging 3,000 words each, about 25M
  chunks after splitting at 512 tokens with 50-token overlap.
- **Update rate?** 50k documents created or edited per day across the company.
- **Query volume?** 20k questions per day, concentrated in business hours,
  peak of about 15 queries/second.
- **Latency target?** Answer with citations in under 4 seconds end to end.
- **Access control?** Documents are permissioned per team, a user must never
  see retrieved content from documents they cannot access, enforced at query
  time, not just at ingestion.
- **Freshness requirement?** A document edited now should be reflected in
  search results within 10 minutes.
- **Answer quality bar?** Every answer must cite the source documents used,
  no citation means the answer is rejected by the product.

## Follow-ups

- Two documents disagree because one is stale, how does the system avoid
  confidently answering from outdated content?
- Query volume grows 10x to 200 queries/second, what is the first bottleneck,
  the vector index or the LLM calls?
- A user asks a question that spans 40 relevant documents, how do you decide
  what fits in the context window and in what order?
- How do you measure retrieval quality in production without manual labeling
  of every query?
- A document's permissions change (a team loses access) after it was already
  embedded and cached, how fast does that propagate and what breaks if it
  does not?

## Rubric

- Describes the ingestion pipeline: extraction, chunking strategy with a
  concrete chunk size and overlap, embedding generation, and indexing.
- Names the core trade-off: chunk size versus retrieval precision, larger
  chunks give more context per hit but dilute embedding relevance and raise
  token cost per retrieved item.
- Enforces access control at query time by filtering the vector search with
  the user's permission set, not relying on pre-filtering at ingestion alone.
- Covers the incremental reindexing path for edited documents within the
  10-minute freshness target, distinct from full reindex.
- Addresses retrieval evaluation: a held-out set of question/document pairs
  and recall@k as a concrete metric, not just "it looks right."
- Discusses reranking or hybrid search (keyword plus vector) to improve
  precision over pure embedding similarity.
- Explains how citations are produced and verified against what was actually
  retrieved, not hallucinated by the model.

## Pitfalls

- Treating this as a pure vector-search problem and skipping access control.
- No plan for incremental updates, assuming the index is rebuilt from scratch.
- Ignoring the cost and latency of embedding 25M chunks and re-embedding on
  every edit.
- Assuming retrieval quality is good because the demo query worked.
